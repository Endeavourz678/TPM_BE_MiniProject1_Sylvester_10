const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const FB_FILE = path.join(DATA_DIR, 'feedback.json');

const readJSON = (p, fallback) => {
  try {
    if (!fs.existsSync(p)) return fallback;
    const raw = fs.readFileSync(p, 'utf8') || '';
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error('readJSON error', e);
    return fallback;
  }
};

const writeJSON = (p, data) => {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
};

exports.listEvents = (req, res) => {
  const data = readJSON(EVENTS_FILE, { events: [] });
  res.json(data.events || []);
};

exports.createEvent = (req, res) => {
  const { title, description } = req.body || {};
  if (!title) return res.status(400).json({ message: 'title required' });

  const data = readJSON(EVENTS_FILE, { lastId: 0, events: [] });

  const newId = (data.lastId || 0) + 1;
  data.lastId = newId;

  const ev = {
    id: newId,
    title: title.toString().trim(),
    description: (description || '').toString().trim(),
    createdAt: new Date().toISOString()
  };

  data.events.push(ev);
  writeJSON(EVENTS_FILE, data);

  res.json({ ok: true, event: ev });
};

exports.deleteEvent = (req, res) => {
  try {
    const rawId = req.params.id;
    const data = readJSON(EVENTS_FILE, { lastId: 0, events: [] });
    const idNum = Number(rawId);
    if (!Number.isNaN(idNum)) {
      data.events = (data.events || []).filter(e => Number(e.id) !== idNum);
    } else {
      data.events = (data.events || []).filter(e => String(e.id) !== String(rawId));
    }
    writeJSON(EVENTS_FILE, data);
    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteEvent error', err);
    return res.status(500).json({ message: 'internal error' });
  }
};


exports.submitFeedback = (req, res) => {
  try {
    console.log('submitFeedback called, body=', req.body);

    const { name, visitorType, employeeId, email, eventId, ratings, saran, kritik } = req.body || {};


    if (!name || !email || (eventId === undefined || eventId === null)) {
      return res.status(400).json({ message: 'name, email, and eventId are required' });
    }

    const numericEventId = Number(eventId);
    if (Number.isNaN(numericEventId)) {
      return res.status(400).json({ message: 'eventId must be a number' });
    }

    let parsedRatings = ratings;
    if (typeof parsedRatings === 'string') {
      try { parsedRatings = JSON.parse(parsedRatings); } catch (err) {
        console.error('ratings parse error', err);
        return res.status(400).json({ message: 'ratings invalid JSON' });
      }
    }
    if (!parsedRatings || typeof parsedRatings !== 'object') {
      return res.status(400).json({ message: 'ratings required (object)' });
    }

    if (visitorType === 'internal' && (!employeeId || String(employeeId).trim() === '')) {
      return res.status(400).json({ message: 'employeeId is required for internal visitors' });
    }

    const eventsData = readJSON(EVENTS_FILE, { lastId: 0, events: [] });
    const eventsArr = eventsData && eventsData.events ? eventsData.events : [];
    if (!eventsArr.find(e => Number(e.id) === numericEventId)) {
      return res.status(400).json({ message: 'eventId not found' });
    }

    const fbData = readJSON(FB_FILE, { lastId: 0, items: [] });
    fbData.items = fbData.items || [];

    fbData.lastId = (typeof fbData.lastId === 'number') ? fbData.lastId : 0;
    const newId = fbData.lastId + 1;
    fbData.lastId = newId;

    const item = {
      id: newId,
      eventId: numericEventId,
      name: String(name).trim(),
      visitorType: visitorType || 'umum',
      employeeId: String(employeeId || '').trim(),
      email: String(email).trim(),
      ratings: parsedRatings,
      saran: String(saran || '').trim(),
      kritik: String(kritik || '').trim(),
      createdAt: new Date().toISOString()
    };

    fbData.items.push(item);

    try {
      writeJSON(FB_FILE, fbData);
    } catch (writeErr) {
      console.error('writeJSON error', writeErr);
      return res.status(500).json({ message: 'could not save feedback' });
    }

    return res.json({ message: 'ok', item });
  } catch (err) {
    console.error('submitFeedback unexpected error', err);
    return res.status(500).json({ message: 'internal error' });
  }
};

exports.listFeedback = (req, res) => {
  try {
    const { eventId, visitorType, from, to, search } = req.query;
    const fbData = readJSON(FB_FILE, { lastId: 0, items: [] });
    let out = (fbData.items || []).slice();

    if (eventId !== undefined && eventId !== null && String(eventId).trim() !== '') {
      const numeric = Number(eventId);
      if (!Number.isNaN(numeric)) {
        out = out.filter(i => Number(i.eventId) === numeric);
      } else {
        out = out.filter(i => String(i.eventId) === String(eventId));
      }
    }

    if (visitorType) out = out.filter(i => String(i.visitorType) === String(visitorType));
    if (from) out = out.filter(i => new Date(i.createdAt) >= new Date(from));
    if (to) out = out.filter(i => new Date(i.createdAt) <= new Date(to));
    if (search) {
      const q = String(search).toLowerCase();
      out = out.filter(i => (i.saran || '').toLowerCase().includes(q) || (i.kritik || '').toLowerCase().includes(q));
    }

    res.json(out);
  } catch (err) {
    console.error('listFeedback error', err);
    res.status(500).json({ message: 'internal error' });
  }
};

exports.deleteFeedback = (req, res) => {
  try {
    const rawId = req.params.id;
    const fb = readJSON(FB_FILE, { lastId: 0, items: [] });
    const idNum = Number(rawId);
    if (!Number.isNaN(idNum)) {
      fb.items = (fb.items || []).filter(i => Number(i.id) !== idNum);
    } else {
      fb.items = (fb.items || []).filter(i => String(i.id) !== String(rawId));
    }
    writeJSON(FB_FILE, fb);
    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteFeedback error', err);
    return res.status(500).json({ message: 'internal error' });
  }
};

exports.exportFeedback = (req, res) => {
  const { eventId } = req.query;
  const fb = readJSON(FB_FILE, { items: [] }).items || [];
  const out = eventId ? fb.filter(i => i.eventId === eventId) : fb;
  res.setHeader('Content-Disposition', 'attachment; filename=feedback.json');
  res.json(out);
};
