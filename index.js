// 导入amqplib模块  
import * as amqp from 'amqplib';  
import  arrayItem  from "./test/arrayItem.json" assert { type: "json" };
import { DicomMetaDictionary } from "./src/DicomMetaDictionary.js";
import { log } from "./src/log.js";
import { Client } from '@elastic/elasticsearch';
import { PinataSDK } from "pinata-web3";
import { readFile } from 'node:fs/promises';
// import { study_tags } from './standard/tags_study_for_doc.js';
// import { series_tags } from './standard/tags_series_for_doc.js';
import { siemens_tags } from './standard/tags_siemens.js';
import study_schema from './standard/studies_output_schema.json' assert { type: 'json' }
import series_schema from './standard/series_output_schema.json' assert { type: 'json' }



const pinata = new PinataSDK({
  pinataJwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmMzdjYmJiNi1kZjVhLTQ3M2UtOTk5ZC0yMTVmNDBkNGI1NzgiLCJlbWFpbCI6InFpYW5qaW5mZW5nQG91dGxvb2suY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjAzZmIzZDU2ZTVjYjhiNGI5OWQyIiwic2NvcGVkS2V5U2VjcmV0IjoiOTdkYmY0YTAwY2RmZDM5MjMyNTQwOTBhOGU4ODNjM2Q4ZjA3MDlhZDdmNGQ0OThhYzhhM2JlZGZmYTZiMzk0ZSIsImV4cCI6MTc1ODE5OTU2Nn0.uKOHEZEDlOp4Cv1KYva_f_nsxLzPNxr30mWTp4qXl68",
  pinataGateway: "black-grubby-minnow-508.mypinata.cloud",
});


// RabbitMQ连接URL  
const url = 'amqp://localhost';  
const pipeline = 'dicoms@custom'
// 创建客户端实例  
const client = new Client({  
    node: 'http://localhost:9200', // Elasticsearch服务的URL  
    // 可以在这里添加更多的配置，如认证信息等  
    auth: {  
        username: 'elastic',  
        password: 'elastic'  
    } 
  });

async function checkDocumentExists(indexName, docId) {
    try {
        const response = await client.get({
            index: indexName,
            id: docId
        });

        if (response.hasOwnProperty('found')) {
            return response.found;
        } else if (response.hasOwnProperty('status') && response.status === 404) {
            return false;
        } else {
            return true;
        }
    } catch (error) {
        if (error.meta.statusCode === 404 || error.meta.body.status === 404) {
            return false;
        } else {
            console.error('Error:', error);
            throw error; // 重新抛出其他类型的错误
        }
    }
}

async function indexDocument(index, documentId, body, pipeline=null) {  
    try {  
        const response = await client.index({  
            index,  
            id: documentId,  
            body,
            // 只有当 pipeline 不是 null 或 undefined 时才包含它  
            ...(pipeline ? { pipeline } : {}), 
        });  
        console.log(`Indexed document with ID ${documentId}: ${response.result}`); // 'created' 或 'updated'    
    } catch (error) {  
        console.error('Error indexing document', error);  
        if (error.meta && error.meta.body && error.meta.body.error) {
            console.error(`Detailed error: ${JSON.stringify(error.meta.body.error)}`);
        }
        throw error; // 重新抛出错误以便上层处理
    }  
}

async function uploadFile(jsonBody) {
    try {
      
      const uploadCID = await pinata.upload.json(jsonBody)
      console.log(uploadCID);
      return uploadCID;
    } catch (error) {
      console.log(error);
    }
  }

// 定义一个函数来递归地删除_vrMap属性  
function removeVrMap(obj) {  
    if (obj && typeof obj === 'object') {  
        // 使用for...in循环来遍历对象的所有属性  
        for (let key in obj) {  
            if (obj.hasOwnProperty(key)) {  
                if (key === '_vrMap') {  
                    // 如果键名是_vrMap，则删除该属性  
                    delete obj[key];  
                } else if (typeof obj[key] === 'object') {  
                    // 如果属性值是一个对象（或数组，因为数组在JavaScript中也是对象），则递归调用  
                    removeVrMap(obj[key]);  
                }  
            }  
        }  
    }  
}  

async function processDicomMessage(dataset) {
    // 创建一个新对象来存储要抽取的Studies keys和它们的值  
    const extracted_study = {};  
    // 遍历需要抽取的keys  
    for (let key in study_schema.items.properties) {
        if (dataset.hasOwnProperty(key)) {
            extracted_study[key] = dataset[key];
        } else {
          // 如果属性不存在，根据Schema生成默认值
          const propertySchema = study_schema.items.properties[key];
          if (propertySchema.type === 'object') {
            extracted_study[key] = {};
            for (let subKey in propertySchema.properties) {
              if (subKey === 'vr') {
                // 使用Schema中定义的固定值
                extracted_study[key][subKey] = propertySchema.properties[subKey].const;
              } else if (subKey === 'Value') {
                extracted_study[key][subKey] = [];
              }
            }
          }
        }
      }

    const study_set = DicomMetaDictionary.naturalizeDataset(extracted_study);
    console.log(JSON.stringify(study_set));
    const exists = await checkDocumentExists('studies', study_set.StudyInstanceUID);
    if (!exists) {
        removeVrMap(study_set)
        await indexDocument('studies', study_set.StudyInstanceUID, study_set, 'timestamp-study')
    }
    
    // 创建一个新对象来存储要抽取的Series keys和它们的值  
    const extracted_series = {};  
    for (let key in series_schema.items.properties) {
        if (dataset.hasOwnProperty(key)) {
            extracted_series[key] = dataset[key];
        } else {
          // 如果属性不存在，根据Schema生成默认值
          const propertySchema = series_schema.items.properties[key];
          if (propertySchema.type === 'object') {
            extracted_series[key] = {};
            for (let subKey in propertySchema.properties) {
              if (subKey === 'vr') {
                // 使用Schema中定义的固定值
                extracted_series[key][subKey] = propertySchema.properties[subKey].const;
              } else if (subKey === 'Value') {
                extracted_series[key][subKey] = [];
              }
            }
          }
        }
      }
    
    const series_set = DicomMetaDictionary.naturalizeDataset(extracted_series);
    series_set.StudyInstanceUID = study_set.StudyInstanceUID;
    console.log(JSON.stringify(series_set));
    const sexists = await checkDocumentExists('series', series_set.SeriesInstanceUID);
    if (!sexists) {
        removeVrMap(series_set)
        await indexDocument('series', series_set.SeriesInstanceUID, series_set, 'timestamp-series')
    }

    // 创建一个新对象来存储要抽取的private keys和它们的值  
    const extracted_siemens = {};  
    siemens_tags.forEach(prefix => {  
        // 遍历dataset中的所有键
        for (let key in dataset) {  
            // 如果键以当前前缀开始 
            if (key.startsWith(prefix)) {
                extracted_siemens[key] = dataset[key];  
                delete dataset[key];
            }
        }  
    });

    //要抽取的instance keys和它们的值  
    const instance_set = DicomMetaDictionary.naturalizeDataset(dataset);
    // console.log(JSON.stringify(instance_set));      
    removeVrMap(instance_set)
    console.log("SOPInstanceUID " + instance_set.SOPInstanceUID);   

    const isObjectEmpty = (obj) => Object.keys(obj).length === 0;  
    if (!isObjectEmpty(extracted_siemens)) {
        const siemens_set = DicomMetaDictionary.naturalizeDataset(extracted_siemens);
        siemens_set.SOPInstanceUID= instance_set.SOPInstanceUID    
        const siexists = await checkDocumentExists('siemens', siemens_set.SOPInstanceUID);
        if (!siexists) {
            removeVrMap(siemens_set)
            await indexDocument('siemens', siemens_set.SOPInstanceUID, siemens_set)
        }
    }

    // try {
    //     const filePath = new URL('/tmp/'+instance_set.SOPInstanceUID, import.meta.url);
    //     const contents = await readFile(filePath, { encoding: 'utf8' });
    //     //console.log(contents);

    //     const uploadCID = await pinata.upload.json(contents)
    //     instance_set.PixelData.BulkDataURI = uploadCID.IpfsHash;

    //   } catch (err) {
    //     console.error(err.message);
    // }
    instance_set.SeriesInstanceUID = series_set.SeriesInstanceUID;
    instance_set.StudyInstanceUID = study_set.StudyInstanceUID;
    console.log(JSON.stringify(instance_set));
    try {
        await indexDocument('instances', instance_set.SOPInstanceUID, instance_set, 'timestamp-instance')
    } catch (error) {
        console.error(`Error indexing instance document with SOPInstanceUID ${instance_set.SOPInstanceUID}:`, error);
        throw error;
    }
}

// 异步函数来处理连接和接收消息  
async function consumeMessages() {  
    try {  
        // 连接到RabbitMQ服务器  
        const conn = await amqp.connect(url);  
        const channel = await conn.createChannel();  
  
        // 声明队列  
        await channel.assertQueue('dicom_queue', {  
            durable: false,  
            autoDelete: true
        });  
  
        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", 'hello');  
  
        // 订阅队列并接收消息  
        channel.consume('dicom_queue', async (msg) => {  
            try {
                if (msg !== null) {  
                    // console.log(" [x] Received %s", msg.content.toString());  
                    // 注意：在真实应用中，你可能需要手动发送确认信号  
                    await processDicomMessage(JSON.parse(msg.content.toString()));
    
                    channel.ack(msg);
                }  
            } catch (error) {
                // 如果处理消息时发生错误，你可以选择：  
                // 1. 重新抛出错误（如果启用了消息的重试机制，RabbitMQ 可能会重新发送消息）  
                // 2. 调用 channel.nack(msg, false, true) 来拒绝消息并将其重新排队（如果需要的话）  
                // 3. 调用 channel.nack(msg, false, false) 或 channel.reject(msg, false) 来拒绝消息并将其丢弃到死信队列（如果配置了）  
                // 4. 记录错误并忽略（不推荐，因为可能会导致消息丢失）  
                channel.nack(msg, false, true);
                console.error('Error processing DICOM message:', error); 
                // 这里我们假设我们想要重新抛出错误以触发可能的重试机制  
                throw error; 
            }
            
        }, {  
            noAck: false // 确认消息  
        });  
    } catch (error) {  
        console.error('Error connecting to RabbitMQ:', error);  
    }  
}  
  
// 调用函数  
consumeMessages();


// const dicomJSON = JSON.stringify(arrayItem);
// console.log(dicomJSON);
// const datasets = JSON.parse(dicomJSON);
// // const natural0 = DicomMetaDictionary.namifyDataset(datasets[0]);
// const natural0 = DicomMetaDictionary.naturalizeDataset(datasets[0]);
// console.log(JSON.stringify(natural0));
// log.log(natural0);
// // Shouldn't throw an exception
// const natural0b = DicomMetaDictionary.naturalizeDataset(datasets[0]);