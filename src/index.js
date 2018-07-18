import express from 'express';
import { MongoChangeStreamManager } from './managers';

const port = process.env.CONNECTOR_API_PORT || 3000;

const app = express();
const manager = new MongoChangeStreamManager;

app.use(express.json());

app.get('/streams', (req, res) => {
    const streams = manager.getStreams();
    res.send(streams);
});

app.get('/streams/:id', (req, res) => {
    const { id } = req.params;
    const stream = manager.getStream(id);
    res.send(stream);
});

app.post('/streams', async (req, res) => {
    const id = await manager.startStream(req.body);
    res.send(id);
});

app.post('/streams/:id/watch_events', (req, res) => {
    const { id } = req.params;
    const { event } = req.body;
    manager.addWatchEvent(id, event);
    res.send(id);
});

app.delete('/streams/:id', (req, res) => {
    const { id } = req.params;
    const stream = manager.stopStream(id);
    res.send();
});

app.delete('/streams/:id/watch_events', (req, res) => {
    const { id } = req.params;
    const { event } = req.body;
    manager.removeWatchEvent(id, event);
    res.send(id);
});

app.listen(port, () => {
    console.log(`Connector & API Started on port ${port}`);
});
