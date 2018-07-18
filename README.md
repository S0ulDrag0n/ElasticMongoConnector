# ElasticMongoConnector
A REST API based connector that subscribes to change streams in MongoDB and saves them in Elasticsearch.

## How to Start
Open a prompt to the root folder & install dependencies first with npm or yarn. Yarn is recommended.

```npm install```

```yarn install```

Start the connector by running: ```npm start run```

## How to Use
To start monitoring streams, we have to first provide some information to the connector through the REST API. This data is not persisted so restarting the connector will require a resubmission of the same information. The default port used is 3000 unless the **CONNECTOR_API_PORT** environment variable is provided specifying otherwise.

Method | Endpoint | Description
------ | -------- | -----------
GET | /streams | Gets all the stream watcher info the server is currently using.
GET | /streams/[watcherId] | Gets a specific stream watcher by ID.
POST | /streams | Creates a stream watcher based on the provided info. The ID is returned after creation.
DELETE | /streams/[watcherId] | Stops a watcher completely & removes it from the list.
POST | /streams/[watcherId]/watch_events | Adds an event for a watcher to watch for in the change stream.
DELETE | /streams/[watcherId]/watch_events/[event] | Removes an event for a watcher.

Below is an example of starting a watcher to watch for changes in a collection. Most fields related to connections should be self explanatory.

The **events** array is a list of [MongoDB change events](https://docs.mongodb.com/manual/reference/change-events/#change-stream-output).

The **elasticIndices** array is a list of indices to save change stream events into. The watcher will always attempt to create the index if it does not exist.

Lastly, the **elasticTypeOverride** property is the type set for the records saved into Elasticsearch. **This is an optional property and the default discriminiator property in MongoDB will be used by default.**

### Watcher Creation Example (post /streams)
```json
{
  "mongoConnection": "mongodb://[username]:[pasword]@[mongoServer]:[port]/[dbName]",
  "mongoDatabase": "[dbName]",
  "mongoCollection": "[collectionName]",
  "events": [
    "[mongoChangeEvent]"
  ],
  "elasticHosts": [
    "[username]:[password]@[elasticServer]:[port]"
  ],
  "elasticIndices": [
    "[indexName]"
  ],
  "elasticTypeOverride": "[elasticType]" 
}
```

# Future Roadmap
- [ ] Containerize in Docker
- [ ] Persist settings
