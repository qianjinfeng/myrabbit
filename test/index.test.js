// import * from "regenerator-runtime/runtime.js";

import { jest } from "@jest/globals";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { DicomMetaDictionary } from "../src/DicomMetaDictionary.js";

import { promisify } from "util";
import arrayItem from "./arrayItem.json";


const fileMetaInformationVersionArray = new Uint8Array(2);
fileMetaInformationVersionArray[1] = 1;

// The asset downloads in this file might take some time on a slower connection
jest.setTimeout(60000);

const metadata = {
    "00020001": {
        Value: [fileMetaInformationVersionArray.buffer],
        vr: "OB"
    },
    "00020012": {
        Value: ["1.2.840.113819.7.1.1997.1.0"],
        vr: "UI"
    },
    "00020002": {
        Value: ["1.2.840.10008.5.1.4.1.1.4"],
        vr: "UI"
    },
    "00020003": {
        Value: [DicomMetaDictionary.uid()],
        vr: "UI"
    },
    "00020010": {
        Value: ["1.2.840.10008.1.2"],
        vr: "UI"
    }
};

const sequenceMetadata = {
    "00080081": { vr: "ST", Value: [null] },
    "00081032": {
        vr: "SQ",
        Value: [
            {
                "00080100": {
                    vr: "SH",
                    Value: ["IMG1332"]
                },
                "00080102": {
                    vr: "SH",
                    Value: ["L"]
                },
                "00080104": {
                    vr: "LO",
                    Value: ["MRI SHOULDER WITHOUT IV CONTRAST LEFT"]
                }
            }
        ]
    },

    52009229: {
        vr: "SQ",
        Value: [
            {
                "00289110": {
                    vr: "SQ",
                    Value: [
                        {
                            "00180088": {
                                vr: "DS",
                                Value: [0.12]
                            }
                        }
                    ]
                }
            }
        ]
    }
};


it("test_array_items", () => {
    const dicomJSON = JSON.stringify(arrayItem);
    const datasets = JSON.parse(dicomJSON);
    const natural0 = DicomMetaDictionary.naturalizeDataset(datasets[0]);
    // Shouldn't throw an exception
    const natural0b = DicomMetaDictionary.naturalizeDataset(datasets[0]);
    // And should be identical to the previous version
    expect(natural0b).toEqual(natural0);
});

it("test_json_1", () => {
    //
    // multiple results example
    // from http://dicom.nema.org/medical/dicom/current/output/html/part18.html#chapter_F
    //
    const dicomJSON = `
[
    {
        "0020000D": {
        "vr": "UI",
        "Value": [ "1.2.392.200036.9116.2.2.2.1762893313.1029997326.945873" ]
    }
    },
    {
    "0020000D" : {
        "vr": "UI",
        "Value": [ "1.2.392.200036.9116.2.2.2.2162893313.1029997326.945876" ]
    }
    }
]
`;
    const datasets = JSON.parse(dicomJSON);
    const firstUID = datasets[0]["0020000D"].Value[0];
    const secondUID = datasets[1]["0020000D"].Value[0];

    //
    // make a natural version of the first study and confirm it has correct value
    //
    const naturalDICOM = DicomMetaDictionary.naturalizeDataset(datasets[0]);

    expect(naturalDICOM.StudyInstanceUID).toEqual(firstUID);

    //
    // make a natural version of a dataset with sequence tags and confirm it has correct values
    //
    const naturalSequence =
        DicomMetaDictionary.naturalizeDataset(sequenceMetadata);

    // The match object needs to be done on the actual element, not the proxied value
    expect(naturalSequence.ProcedureCodeSequence[0]).toMatchObject({
        CodeValue: "IMG1332"
    });

    // tests that single element sequences have been converted
    // from arrays to values.
    // See discussion here for more details: https://github.com/dcmjs-org/dcmjs/commit/74571a4bd6c793af2a679a31cec7e197f93e28cc
    const spacing =
        naturalSequence.SharedFunctionalGroupsSequence.PixelMeasuresSequence
            .SpacingBetweenSlices;
    expect(spacing).toEqual(0.12);
    expect(
        Array.isArray(naturalSequence.SharedFunctionalGroupsSequence)
    ).toEqual(true);

    expect(naturalSequence.ProcedureCodeSequence[0]).toMatchObject({
        CodingSchemeDesignator: "L",
        CodeMeaning: "MRI SHOULDER WITHOUT IV CONTRAST LEFT"
    });

    // expect original data to remain unnaturalized
    expect(sequenceMetadata["00081032"].Value[0]).toHaveProperty("00080100");
    expect(sequenceMetadata["00081032"].Value[0]).toHaveProperty("00080102");
    expect(sequenceMetadata["00081032"].Value[0]).toHaveProperty("00080104");

    //
    // convert to part10 and back
    //
    // const dicomDict = new DicomDict(metadata);
    // dicomDict.dict = datasets[1];
    // const part10Buffer = dicomDict.write();

    // const dicomData = dcmjs.data.DicomMessage.readFile(part10Buffer);
    // const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(
    //     dicomData.dict
    // );

    // expect(dataset.StudyInstanceUID).toEqual(secondUID);
});

