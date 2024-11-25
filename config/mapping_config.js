
// 定义索引映射
const indexMappings = {
  study_template: {
      index_patterns: [ "study" ],
      settings: {
        "analysis": {
            "filter": {
                "pinyin": {
                    "ignore_pinyin_offset": "true",
                    "lowercase": "true",
                    "keep_original": "true",
                    "keep_separate_first_letter": "false",
                    "type": "pinyin",
                    "limit_first_letter_length": "16",
                    "keep_full_pinyin": "true"
                }
            },
            "analyzer": {
            "pinyin_analyzer": {
                "filter": [ "pinyin" ],
                "type": "custom",
                "tokenizer": "standard"
            }
            }
        }
      },
      properties: {
        "StudyID": {
          "type": "text",
          "fields": {
            "keyword": {
                "type": "keyword"
            }
          }
        },
        "PatientSex": {
          "type": "keyword"
        },
        "PatientID": {
          "type": "text",
          "fields": {
            "keyword": {
                "type": "keyword"
            }
          }
        },
        "StudyDescription": {
          "type": "text"
        },
        "StudyInstanceUID": {
          "type": "keyword"
        },
        "StudyDate": {
          "type": "date"
        },
        "Modality": {
          "type": "keyword"
        },
        "AccessionNumber": {
          "type": "text",
          "fields": {
            "keyword": {
                "type": "keyword"
            }
          }
        },
        "title": {
          "type": "text",
          "fields": {
            "suggest": {
              "type": "completion",
              "analyzer": "pinyin_analyzer",
              "preserve_separators": true,
              "preserve_position_increments": true,
              "max_input_length": 50
            }
          },
          "analyzer": "pinyin_analyzer"
        }
      }
    },
    series_template: {
      index_patterns: [ "series" ],
      properties: {
        "StudyInstanceUID": {
          "type": "keyword"
        },
        "BodyPartExamined": {
          "type": "keyword"
        },
        "SeriesInstanceUID": {
          "type": "keyword"
        }
      }
    }
    // instances: {
    //   properties: {
    //     instanceID: { type: 'keyword' },
    //     status: { type: 'text' },
    //     // ... 其他instance相关的字段
    //   }
    // },
    // siemens: {
    //   properties: {
    //     // 假设siemens有特定的映射
    //     model: { type: 'text' },
    //     serialNumber: { type: 'keyword' },
    //     // ... 其他siemens相关的字段
    //   }
    // }
  };
   
  // 索引名称数组
  const indicesTemplates = ['study_template', 'series_template'];

  export { indexMappings, indicesTemplates };
