import elasticsearch from 'elasticsearch';
import { MongoClient } from 'mongodb';
import uuid from 'uuid/v5';

export class MongoChangeStreamWatcher {
    _elasticClient = null;
    _mongoClient = null;
    _cursor = null;
    constructor (watchInfo) {
        this.info = watchInfo;

        const {
            mongoConnection,
            mongoCollection,
            elasticHosts,
            elasticIndices,
        } = watchInfo;

        const elasticHostQuery = elasticHosts.map((host, i) => `$host${i}=${host}`).join('&');
        const elasticIndicesQuery = elasticIndices.map((index, i) => `$index${i}=${index}`).join('&');

        this.id = uuid(`${mongoConnection}/${mongoCollection}?${elasticHostQuery}&${elasticIndicesQuery}`, uuid.URL);

        this._initializeElasticClient(elasticHosts);
    }
    _initializeElasticClient = elasticHosts => {
        this._elasticClient = new elasticsearch.Client(elasticHosts);

        console.log('-- Client Health --');
        this._elasticClient.cluster.health({}, (err,resp,status) =>  {  
            if (err) {
                return err;
            }
            else {
                console.log(status, resp);
            }
        });
    }
    _ensureElasticClientInitialized = () => {
        const { elasticHosts } = this.info;

        if (!this._elasticClient) {
            this._initializeElasticClient(elasticHosts);
        }
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

            let replaced = serialized.replace('_id', 'id');
            while (replaced.indexOf('_id') >= 0) {
                replaced = replaced.replace('_id', 'id');
            }

            const deserialized = JSON.parse(replaced);

            console.log(deserialized);

            elasticIndices.forEach(async index => {
                this._elasticClient.index({
                    index,
                    id: deserialized.id._data,
                    type: elasticTypeOverride || deserialized.operationType,
                    body: deserialized,
                })
            });
        }
    }
    start = async () => {
        const {
            mongoConnection,
            mongoCollection,
            elasticIndices,
        } = this.info;

        elasticIndices.forEach(elasticIndex => {
            this._elasticClient.indices.create({ index: elasticIndex }, (err, resp, status) => {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log(status, resp);
                }
            });
        });

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
