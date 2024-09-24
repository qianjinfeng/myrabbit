// 导入amqplib模块  
import * as amqp from 'amqplib';  
import  arrayItem  from "./test/arrayItem.json" assert { type: "json" };
import { DicomMetaDictionary } from "./src/DicomMetaDictionary.js";
import { log } from "./src/log.js";
import { Client } from '@elastic/elasticsearch';
import { PinataSDK } from "pinata-web3";
import { readFile } from 'node:fs/promises';


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

async function indexDocument(index, documentId, body) {  
    try {  
        const response = await client.index({  
            index,  
            id: documentId,  
            body,
            pipeline,  
        });  
        console.log(response.result); // 'created' 或 'updated'  
    } catch (error) {  
        console.error('Error indexing document', error);  
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
            if (msg !== null) {  
                console.log(" [x] Received %s", msg.content.toString());  
                // 注意：在真实应用中，你可能需要手动发送确认信号  
                const adataset = JSON.parse(msg.content.toString());
                const natural0 = DicomMetaDictionary.naturalizeDataset(adataset);
                console.log(natural0.SOPInstanceUID);
                

                try {
                    const filePath = new URL('/tmp/'+natural0.SOPInstanceUID, import.meta.url);
                    const contents = await readFile(filePath, { encoding: 'utf8' });
                    console.log(contents);

                    const uploadCID = await pinata.upload.json(contents)
                    natural0.PixelData.BulkDataURI = uploadCID.IpfsHash;

                  } catch (err) {
                    console.error(err.message);
                }

                console.log(JSON.stringify(natural0));

                //indexDocument('dicoms', natural0.SOPInstanceUID, natural0)
            }  
        }, {  
            noAck: true // 自动确认消息  
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