import { Client } from '@elastic/elasticsearch';
import config from './config/env.js';
import { log } from "./lib/log.js";
import {pipelinesConfig, pipelineNames} from './config/pipeline_config.js'
import {indexMappings, indicesTemplates} from './config/mapping_config.js'

const client = new Client({
  node: config.elasticsearch.node,
  auth: config.elasticsearch.auth
});

export async function checkDocumentExists(indexName, docId) {
  try {
    const response = await client.get({
      index: indexName,
      id: docId
    });
    return response.found;
  } catch (error) {
    if (error.meta.statusCode === 404 || error.meta.body.status === 404) {
      return false;
    } else {
      log.error('Error:', error);
      throw error;
    }
  }
}

export async function indexDocument(index, documentId, body, pipeline = null) {
  try {
    const response = await client.index({
      index,
      id: documentId,
      body,
      ...(pipeline ? { pipeline } : {})
    });
    log.info(`Indexed document with ID ${documentId}: ${response.result}`);
  } catch (error) {
    log.error('Error indexing document', error);
    if (error.meta && error.meta.body && error.meta.body.error) {
      log.error(`Detailed error: ${JSON.stringify(error.meta.body.error)}`);
    }
    throw error;
  }
}

export async function setupIndicesAndPipelines() {
    const indicesToDelete = ['study', 'series', 'instance', 'siemens'];

    for (const index of indicesToDelete) {
        try {
            await client.indices.delete({
                index: index
            });
            log.info(`Index ${index} deleted.`);
        } catch (error) {
            if (error.meta.statusCode === 404) {
              log.info(`Index ${index} does not exist.`);
            } else {
              log.error(`Error deleting index ${index}:`, error);
            }
        }
    }
  // 定义索引映射和管道逻辑
  // Setup Template
  for (const temp of indicesTemplates) {
    try {
        await client.indices.deleteIndexTemplate({
            name: temp
        });
        log.info(`Template ${temp} mapping deleted.`);
    } catch (error) {
      if (error.meta.statusCode === 400 ) {
        log.info(`Template ${temp} does not exists.`);
      } else {
        log.error(`Error creating Template ${temp}:`, error);
      }
    }
  }

  for (const temp of indicesTemplates) {
    try {
      log.info(`Template ${indexMappings[temp].properties} mapping created.`);
        await client.indices.putIndexTemplate({
            name: temp,
            body: {
                template: {
                    settings: indexMappings[temp].settings || {},
                    mappings: {
                        properties: indexMappings[temp].properties
                    }
                },
                index_patterns: indexMappings[temp].index_patterns
            }
        });
        log.info(`Template ${temp} mapping created.`);
    } catch (error) {
      if (error.meta.statusCode === 400 && error.meta.body.error.type === 'resource_already_exists_exception') {
        log.info(`Template ${temp} already exists.`);
      } else {
        log.error(`Error creating Template ${temp}:`, error);
        throw error;
      }
    }
  }

  // Setup pipelines
  for (const name of pipelineNames) {
    try {
        // 创建管道
        await client.ingest.putPipeline({
            id: name,
            body: {
                processors: pipelinesConfig[name].processors
            }
        });
        log.info(`Pipeline ${name} created.`);
    } catch (error) {
      if (error.meta.statusCode === 400 && error.meta.body.error.type === 'resource_already_exists_exception') {
        log.info(`Pipeline ${name} already exists.`);
      } else {
        log.error(`Error creating pipeline ${name}:`, error);
        throw error;
      }
    }
  }
}
