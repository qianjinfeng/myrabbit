

import { Client } from '@elastic/elasticsearch';
import { log } from "../src/log.js";
import { DicomMetaDictionary } from "../src/DicomMetaDictionary.js";
import schema from '../standard/instances_output_schema.json' assert { type: 'json' }
import data from './aItem.json' assert { type: 'json' }

// const client = new Client({  
//     node: 'http://localhost:9200', // Elasticsearch服务的URL  
//     // 可以在这里添加更多的配置，如认证信息等  
//     auth: {  
//         username: 'elastic',  
//         password: 'elastic'  
//     } 
//   });

//   const body = await client.search({
//     index: "studies",
//     body: {
//       query: { match_all: {} },
//       from: 0,
//       size: 10,
//     },
//     // from: 0,
//     // size: 10,
//     // query: {
//     //     match_all: {} 
//     // },
//   });
//   console.log(body);
//   const study_set = DicomMetaDictionary.denaturalizeDataset(body.hits.hits[0]._source);
//   console.log(study_set);

const result = {};
  for (let key in schema.items.properties) {
    if (data.hasOwnProperty(key)) {
      result[key] = data[key];
    } else {
      // 如果属性不存在，根据Schema生成默认值
      const propertySchema = schema.items.properties[key];
      if (propertySchema.type === 'object') {
        result[key] = {};
        for (let subKey in propertySchema.properties) {
          if (subKey === 'vr') {
            // 使用Schema中定义的固定值
            result[key][subKey] = propertySchema.properties[subKey].const;
          } else if (subKey === 'Value') {
            result[key][subKey] = propertySchema.properties[subKey].default || [];
          }
        }
      }
    }
  }

  console.log('Extracted JSON:', result);
  console.log(DicomMetaDictionary.naturalizeDataset(result));