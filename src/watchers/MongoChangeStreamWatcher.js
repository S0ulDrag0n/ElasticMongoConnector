import { MongoClient } from 'mongodb';
import uuid from 'uuid/v5';
import MessageQueue from './MessageQueue';

export class MongoChangeStreamWatcher {
    _messageQueue = null;
    _mongoClient = null;
    _cursor = null;
    constructor(watchInfo) {
        this.info = watchInfo;

        this._messageQueue = new MessageQueue(watchInfo);

        const {
            mongoConnection,
            mongoCollection,
            elasticHosts,
            elasticIndices,
        } = watchInfo;

        const elasticHostQuery = elasticHosts.map((host, i) => `$host${i}=${host}`).join('&');
        const elasticIndicesQuery = elasticIndices.map((index, i) => `$index${i}=${index}`).join('&');

        //Create an unique ID based on what data is being watched and transferred where
        this.id = uuid(`${mongoConnection}/${mongoCollection}?${elasticHostQuery}&${elasticIndicesQuery}`, uuid.URL);
    }
    _startWatch = async () => {
        let next;

        while (!this._cursor.isClosed() && (next = await this._cursor.next()))
        {
            const {
                events,
                elasticIndices,
                elasticTypeOverride,
            } = this.info;
            
            if (events.indexOf(next.operationType) < 0) {
                continue;
            }

            const serialized = JSON.stringify(next);

            // Replace '_id' properties as it conflicts with ES
            let replaced = serialized.replace('_id', 'id');
            while (replaced.indexOf('_id') >= 0) {
                replaced = replaced.replace('_id', 'id');
            }

            const deserialized = JSON.parse(replaced);

            console.log(`[Mongo Change Event] ${deserialized.operationType}: ${deserialized.id._data}`);

            elasticIndices.forEach(index => {
                const message = {
                    index,
                    id: deserialized.id._data,
                    type: elasticTypeOverride || deserialized.operationType,
                    body: deserialized,
                };

                this._messageQueue.queueMessage(message);
            });
        }
    }
    start = async () => {
        const {
            mongoConnection,
            mongoCollection,
        } = this.info;

        this._mongoClient = await MongoClient.connect(mongoConnection, { useNewUrlParser: true });
            
        const db = this._mongoClient.db();
        const collection = db.collection(mongoCollection);

        this._cursor = collection.watch();

        this._startWatch();
    }
    stop = async () => {
        await this._cursor.close();
        await this._mongoClient.close(true);
    }
}
