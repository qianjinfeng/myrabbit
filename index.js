import { processDicomMessage } from './processor.js';
import { setupIndicesAndPipelines } from './es.js';
import * as amqp from 'amqplib';
import config from './config/env.js';
import { log } from "./lib/log.js";

export async function connectToRabbitMQ() {
  const conn = await amqp.connect(config.rabbitmq.url);
  const channel = await conn.createChannel();
  return channel;
}

export async function consumeMessages(channel, callback) {
  try {
    await channel.assertQueue(config.rabbitmq.queue, {
      durable: false,
      autoDelete: true
    });

    log.info(" [*] Waiting for messages in %s. To exit press CTRL+C", config.rabbitmq.queue);

    channel.consume(config.rabbitmq.queue, async (msg) => {
      try {
        if (msg !== null) {
          await callback(JSON.parse(msg.content.toString()));
          channel.ack(msg);
        }
      } catch (error) {
        channel.nack(msg, false, true);
        log.error('Error processing DICOM message:', error);
        throw error;
      }
    }, {
      noAck: false
    });
  } catch (error) {
    log.error('Error connecting to RabbitMQ:', error);
  }
}

(async () => {
  try {
    // Initialize Elasticsearch indices and pipelines
    await setupIndicesAndPipelines();

    // Connect to RabbitMQ and start consuming messages
    const channel = await connectToRabbitMQ();
    consumeMessages(channel, processDicomMessage);
  } catch (error) {
    log.error('Error initializing application:', error);
  }
})();