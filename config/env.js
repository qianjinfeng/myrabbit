import dotenv from 'dotenv';
dotenv.config();

const config = {
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost',
    queue: process.env.RABBITMQ_QUEUE || 'dicom_queue'
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    auth: {
      username: process.env.ELASTICSEARCH_USER || 'elastic',
      password: process.env.ELASTICSEARCH_PASS || 'elastic'
    },
    pipelines: {
      studies: process.env.PIPELINE_STUDIES || 'timestamp-study',
      series: process.env.PIPELINE_SERIES || 'timestamp-series',
      instances: process.env.PIPELINE_INSTANCES || 'timestamp-instance'
    }
  },
  ipfs: {
    rpc: process.env.PINATA_JWT || "YOUR_PINATA_JWT",
    gateway: process.env.PINATA_GATEWAY || "YOUR_PINATA_GATEWAY"
  }
};

export default config;