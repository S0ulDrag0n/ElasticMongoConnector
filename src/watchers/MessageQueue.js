import elasticsearch from 'elasticsearch';
import uuid from 'uuid/v1';
import { AsyncHandler } from '../common';

const DEF_REQLIMIT = 100;
const DEF_REQTIMEOUT = 0;

export default class MessageQueue {
    _messages = [];
    _requests = {};
    _messageLoop = null;
    _elasticClient = null;
    constructor(watchInfo) {
        this.info = watchInfo;

        const {
            elasticHosts,
            elasticIndices,
        } = watchInfo;

        this._initializeElasticClient(elasticHosts, elasticIndices);
    }
    _initializeElasticClient = (elasticHosts, elasticIndices) => {
        this._elasticClient = new elasticsearch.Client({
            hosts: elasticHosts,
        });

        console.log('-- Client Health --');
        this._elasticClient.cluster.health({}, (err, resp, status) =>  {  
            if (err) {
                return err;
            }
            else {
                console.log(status, resp);
            }
        });

        // Create indices if they do not exist
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
    }
    _ensureElasticClientInitialized = () => {
        const { elasticHosts } = this.info;

        if (!this._elasticClient) {
            this._initializeElasticClient(elasticHosts);
        }
    }
    _timeout = () => new Promise(resolve => setTimeout(resolve, this.info.requestTimeout | DEF_REQTIMEOUT));
    _startMessageLoop = async () => {
        this._ensureElasticClientInitialized();

        // Send off queued messages
        while (this._messages.length > 0) {
            const { requestLimit } = this.info;

            const requests = Object.values(this._requests);

            // Wait for any of the requests to finish if the request limit was reached
            if (requests.length >= (requestLimit | DEF_REQLIMIT)) {
                console.log(`[Message Queue] Waiting for current requests to finish. Queue: ${this._messages.length} Waiting: ${requests.length}`);

                await Promise.race(requests);

                continue;
            }

            const messageId = uuid();

            // Synchronously (within this context) remove first in the queue
            const message = this._messages.shift();

            if (message) {
                this._requests[messageId] = this._sendMessage(messageId, message)
                    .then(finished => {
                        const [err, result, id] = finished;

                        if (err) {
                            console.log(`[Message Queue] Error sending message ${id}`, err);
                        }
                        
                        //Request considered complete regardless of result
                        delete this._requests[id];

                        console.log(`[Message Queue] Removed message ${id}`);
                    });
            }
        }
    }
    _sendMessage = async (id, message) => {
        // Do not send too quickly or else server will return 429
        await this._timeout();

        // Send message async
        const [err, result] = await AsyncHandler(this._elasticClient.index(message));

        if (err) {
            return [err, null, id, message];
        }
        else {
            console.log(`[Message Queue] Sent message ${id}`);

            return [null, result, id, message];
        }
    }
    queueMessage = message => {
        this._messages.push(message);

        if (!this._messageLoop) {
            console.log(`[Message Queue] Sending messages. Queue: ${this._messages.length}`);
            this._messageLoop = this._startMessageLoop().then(() => {
                console.log('[Message Queue] No more messages');
                this._messageLoop = null;
            });
        }

        return this._messageLoop;
    }
}
