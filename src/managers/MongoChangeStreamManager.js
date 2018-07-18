import { MongoChangeStreamWatcher } from '../watchers'

export class MongoChangeStreamManager {
    _watchers = {};
    getStreams = () => {
        const keys = Object.keys(this._watchers);

        const streams = keys.map(key => this._watchers[key].info);

        return streams;
    }
    getStream = id => this._watchers[id].info
    startStream = async watchInfo => {
        const {
            mongoConnection,
            mongoCollection,
            events
        } = watchInfo;

        const watcher = new MongoChangeStreamWatcher(watchInfo);

        if (this._watchers[watcher.id]) {
            return this._watchers[watcher.id].id;
        }

        try{
            await watcher.start();

            console.log(`[${Date()}] Watching for ${events} events on ${mongoCollection}`);

            this._watchers = {
                ...this._watchers,
                [watcher.id]: watcher,
            };

            return watcher.id;
        }
        catch (err) {
            console.log(`[${Date()}] Could not connect to ${mongoConnection}`);
        }
    }
    stopStream = id => {
        const watcher = this._watchers[id];

        watcher.stop();

        const watchers = {
            ...this._watchers,
            [watcher.id]: undefined,
        };

        delete watchers[watcher.id];

        this._watchers = watchers;
    }
    addWatchEvent = (id, event) => {
        const watcher = this._watchers[id];

        console.log(id, event, watcher);

        if (watcher.info.events.indexOf(event) < 0) {
            watcher.info.events = [
                ...watcher.info.events,
                event,
            ];

            console.log(`[${Date()}] Also watching for ${event} event on ${watcher.info.mongoCollection}`);
        }
    }
    removeWatchEvent = (id, event) => {
        const watcher = this._watchers[id];

        if (watcher.info.events.indexOf(event) >= 0) {
            watcher.info.events = watcher.info.events.filter(e => e !== event);

            console.log(`[${Date()}] No longer watching for ${event} event on ${watcher.info.mongoCollection}`);
        }
    }
}
