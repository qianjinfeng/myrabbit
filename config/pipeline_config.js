// 定义三个管道的配置
const pipelinesConfig = {
    timestamp_study: {
        processors: [
            // ... study管道的处理器定义
            {
                "set": {
                  "field": "@timestamp",
                  "value": "{{_source.StudyDate}}{{_source.StudyTime}}",
                  "ignore_empty_value": true,
                  "if": "ctx?.StudyDate != null",
                  "ignore_failure": true
                }
              },
              {
                "date": {
                  "field": "@timestamp",
                  "formats": [
                    "yyyyMMddHHmmss||yyyyMMddHHmmss.SSS||yyyyMMddHHmmss.SSSSSS"
                  ],
                  "ignore_failure": true
                }
              }
        ]
    },
    timestamp_series: {
        processors: [
            // ... series管道的处理器定义
            {
                "set": {
                  "field": "@timestamp",
                  "value": "{{_source.SeriesDate}}{{_source.SeriesTime}}",
                  "ignore_empty_value": true,
                  "if": "ctx?.SeriesDate != null",
                  "ignore_failure": true
                }
              },
              {
                "date": {
                  "field": "@timestamp",
                  "formats": [
                    "yyyyMMddHHmmss||yyyyMMddHHmmss.SSS||yyyyMMddHHmmss.SSSSSS"
                  ],
                  "ignore_failure": true
                }
              }
        ]
    },
    timestamp_instance: {
        processors: [
            // ... instance管道的处理器定义
            {
                "set": {
                  "field": "@timestamp",
                  "value": "{{_source.AcquisitionDate}}{{_source.AcquisitionTime}}",
                  "ignore_empty_value": true,
                  "if": "ctx?.AcquisitionDate != null",
                  "ignore_failure": true
                }
              },
              {
                "date": {
                  "field": "@timestamp",
                  "formats": [
                    "yyyyMMddHHmmss||yyyyMMddHHmmss.SSS||yyyyMMddHHmmss.SSSSSS"
                  ],
                  "ignore_failure": true
                }
              }
        ]
    }
};
 
// 管道名称数组
const pipelineNames = ['timestamp_study', 'timestamp_series', 'timestamp_instance'];


export { pipelinesConfig, pipelineNames };
