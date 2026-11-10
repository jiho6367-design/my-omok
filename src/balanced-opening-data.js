// Optional manual fifth choices. Automatic engine recommendations are independent.
const OmokBalancedOpeningData={
 "version": 3,
 "rulesId": "15x15-exact5-both33-v1",
 "coordinateSystem": "A-O including I; center H8",
 "ruleScope": "source-evaluation-only",
 "sources": [
  {
   "id": "soosyrv-guide-20190701",
   "title": "索索夫规则 开局指南",
   "author": "喵声依旧",
   "date": "2019-07-01",
   "url": "https://github.com/taotao568685/Renju-files/blob/master/%E7%B4%A2%E7%B4%A2%E5%A4%AB%E5%BC%80%E5%B1%80%E6%8C%87%E5%8D%972019-07-01-CHS.pdf",
   "sha256": "3e6b1c1a719c031a5b2b6828a1812e768c5c8df7b6e7842ac6c80ea7963bbdb2",
   "rulesScope": "Historical asymmetric Renju with the Soosyrv opening procedure; not equality proof under house rules."
  },
  {
   "id": "tarannikov-yamaguchi-20090829",
   "kind": "web",
   "url": "https://www.renju.net/forum/thread/305/",
   "author": "Yuriy Tarannikov",
   "title": "Dictionary of Yamaguchi rule",
   "postedDate": "2008-02-23",
   "date": "2009-08-29",
   "dateKind": "last-stated-revision",
   "section": "board20",
   "embeddedMoveString": "h8i9i7g9f8",
   "assessment": "equal",
   "coordinateSystem": "A-O including I; H8 center",
   "rules": "Historical standard Renju with asymmetric black-only restrictions",
   "assessmentConflict": {
    "sourceId": "soosyrv-guide-20190701",
    "sourceKind": "pdf",
    "date": "2019-07-01",
    "url": "https://github.com/taotao568685/Renju-files/blob/master/%E7%B4%A2%E7%B4%A2%E5%A4%AB%E5%BC%80%E5%B1%80%E6%8C%87%E5%8D%972019-07-01-CHS.pdf",
    "pdfSha256": "3e6b1c1a719c031a5b2b6828a1812e768c5c8df7b6e7842ac6c80ea7963bbdb2",
    "pdfPage": 25,
    "printedPage": 19,
    "section": "I7",
    "diagramLocation": "I7 detail r1c1 / page lower-left",
    "diagramLabel": "6",
    "fourth": "G9",
    "fifth": "F8",
    "assessment": "complex-white-better",
    "sourceGroupAlternatives": [
     {
      "diagramLabel": "6",
      "fifth": "F8",
      "offsetFromH8": [
       -2,
       0
      ]
     },
     {
      "diagramLabel": "7",
      "fifth": "K9",
      "offsetFromH8": [
       3,
       1
      ]
     }
    ],
    "alternativesNotContinuation": true,
    "correction": "The companion alternative labeled 7 is K9, not J9. It is not a reply after F8.",
    "summary": "2019 자료는 같은 수를 복잡한 후공 우세로 평가합니다."
   }
  },
  {
   "id": "shuxingge-guide-20260403",
   "kind": "pdf",
   "title": "漱星阁开局指南",
   "author": "漱星阁",
   "date": "2026-04-03",
   "url": "https://note.com/api/v2/attachments/download/e92da2a6017b61bfb3ef89437d0f6294",
   "sha256": "f91cf4ba2d723ba40687efbd84516008e8168780e22a822d62a48214f1c5527a",
   "pages": 251,
   "rulesScope": "Published standard Renju position assessments; manual references only, not equality proof under house rules."
  }
 ],
 "catalog": [
  {
   "id": "D1",
   "title": "한성",
   "moves": [
    112,
    127,
    142
   ]
  },
  {
   "id": "D2",
   "title": "계월",
   "moves": [
    112,
    127,
    143
   ]
  },
  {
   "id": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144
   ]
  },
  {
   "id": "D4",
   "title": "화월",
   "moves": [
    112,
    127,
    128
   ]
  },
  {
   "id": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129
   ]
  },
  {
   "id": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113
   ]
  },
  {
   "id": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114
   ]
  },
  {
   "id": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97
   ]
  },
  {
   "id": "D9",
   "title": "구월",
   "moves": [
    112,
    127,
    98
   ]
  },
  {
   "id": "D10",
   "title": "신월",
   "moves": [
    112,
    127,
    99
   ]
  },
  {
   "id": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82
   ]
  },
  {
   "id": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83
   ]
  },
  {
   "id": "D13",
   "title": "직접 유성",
   "moves": [
    112,
    127,
    84
   ]
  },
  {
   "id": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144
   ]
  },
  {
   "id": "I2",
   "title": "협월",
   "moves": [
    112,
    128,
    129
   ]
  },
  {
   "id": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114
   ]
  },
  {
   "id": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99
   ]
  },
  {
   "id": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84
   ]
  },
  {
   "id": "I6",
   "title": "운월",
   "moves": [
    112,
    128,
    113
   ]
  },
  {
   "id": "I7",
   "title": "포월",
   "moves": [
    112,
    128,
    98
   ]
  },
  {
   "id": "I8",
   "title": "람월",
   "moves": [
    112,
    128,
    83
   ]
  },
  {
   "id": "I9",
   "title": "은월",
   "moves": [
    112,
    128,
    97
   ]
  },
  {
   "id": "I10",
   "title": "명성",
   "moves": [
    112,
    128,
    82
   ]
  },
  {
   "id": "I11",
   "title": "사월",
   "moves": [
    112,
    128,
    96
   ]
  },
  {
   "id": "I12",
   "title": "명월",
   "moves": [
    112,
    128,
    81
   ]
  },
  {
   "id": "I13",
   "title": "혜성",
   "moves": [
    112,
    128,
    80
   ]
  }
 ],
 "lines": [
  {
   "id": "D1-p7-J8-J11",
   "familyId": "D1",
   "title": "한성",
   "moves": [
    112,
    127,
    142,
    114,
    159
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 7,
   "printedPage": 1,
   "diagramLabel": "10"
  },
  {
   "id": "D1-p7-J9-J8",
   "familyId": "D1",
   "title": "한성",
   "moves": [
    112,
    127,
    142,
    129,
    114
   ],
   "assessment": "equal-slight-black",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 7,
   "printedPage": 1,
   "diagramLabel": "6"
  },
  {
   "id": "D1-p7-J10-J7",
   "familyId": "D1",
   "title": "한성",
   "moves": [
    112,
    127,
    142,
    144,
    99
   ],
   "assessment": "complex-equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 7,
   "printedPage": 1,
   "diagramLabel": "9"
  },
  {
   "id": "D1-p7-J10-F10",
   "familyId": "D1",
   "title": "한성",
   "moves": [
    112,
    127,
    142,
    144,
    140
   ],
   "assessment": "complex-equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 7,
   "printedPage": 1,
   "diagramLabel": "10"
  },
  {
   "id": "D2-p8-J7-J8",
   "familyId": "D2",
   "title": "계월",
   "moves": [
    112,
    127,
    143,
    99,
    114
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 8,
   "printedPage": 2,
   "diagramLabel": "11"
  },
  {
   "id": "D2-p8-J9-K10",
   "familyId": "D2",
   "title": "계월",
   "moves": [
    112,
    127,
    143,
    129,
    145
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 8,
   "printedPage": 2,
   "diagramLabel": "10"
  },
  {
   "id": "D3-p9-G7-I9",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    96,
    128
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 9,
   "printedPage": 3,
   "diagramLabel": "7"
  },
  {
   "id": "D3-p9-I7-K7",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    98,
    100
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 9,
   "printedPage": 3,
   "diagramLabel": "9"
  },
  {
   "id": "D3-p9-J8-K9",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    114,
    130
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 9,
   "printedPage": 3,
   "diagramLabel": "8"
  },
  {
   "id": "D3-p9-I9-G9",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    128,
    126
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 9,
   "printedPage": 3,
   "diagramLabel": "1"
  },
  {
   "id": "D4-p10-G7-I7",
   "familyId": "D4",
   "title": "화월",
   "moves": [
    112,
    127,
    128,
    96,
    98
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "10"
  },
  {
   "id": "D4-p10-G7-G8",
   "familyId": "D4",
   "title": "화월",
   "moves": [
    112,
    127,
    128,
    96,
    111
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "11"
  },
  {
   "id": "D4-p10-I8-H6",
   "familyId": "D4",
   "title": "화월",
   "moves": [
    112,
    127,
    128,
    113,
    82
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "7"
  },
  {
   "id": "D4-p10-I8-K6",
   "familyId": "D4",
   "title": "화월",
   "moves": [
    112,
    127,
    128,
    113,
    85
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "6"
  },
  {
   "id": "D5-p10-G7-G6",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    96,
    81
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "9"
  },
  {
   "id": "D5-p10-G7-F7",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    96,
    95
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "10"
  },
  {
   "id": "D5-p10-G7-H10",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    96,
    142
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "7"
  },
  {
   "id": "D5-p10-G7-J10",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    96,
    144
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "8"
  },
  {
   "id": "D5-p10-I7-G6",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    98,
    81
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "13"
  },
  {
   "id": "D5-p10-I7-F9",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    98,
    125
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "14"
  },
  {
   "id": "D5-p10-J7-K6",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    99,
    85
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "10"
  },
  {
   "id": "D5-p10-J7-H10",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    99,
    142
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "11"
  },
  {
   "id": "D5-p10-G8-G7",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    111,
    96
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "5"
  },
  {
   "id": "D5-p10-G8-J8",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    111,
    114
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "4"
  },
  {
   "id": "D5-p10-G8-I9",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    111,
    128
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "6"
  },
  {
   "id": "D5-p10-J8-G6",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    114,
    81
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "10"
  },
  {
   "id": "D5-p10-J8-H6",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    114,
    82
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "9"
  },
  {
   "id": "D5-p10-I10-I9",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    143,
    128
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 10,
   "printedPage": 4,
   "diagramLabel": "7"
  },
  {
   "id": "D6-p11-G7-F7",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    96,
    95
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "11"
  },
  {
   "id": "D6-p11-G7-K8",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    96,
    115
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "12"
  },
  {
   "id": "D6-p11-H7-F6",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    97,
    80
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "11"
  },
  {
   "id": "D6-p11-I7-G9",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    98,
    126
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "6"
  },
  {
   "id": "D6-p11-G8-G7",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    111,
    96
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "4"
  },
  {
   "id": "D6-p11-J8-I6",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    114,
    83
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "9"
  },
  {
   "id": "D6-p11-J8-G7",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    114,
    96
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "6"
  },
  {
   "id": "D6-p11-J8-J7",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    114,
    99
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "8"
  },
  {
   "id": "D6-p11-J8-G8",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    114,
    111
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "10"
  },
  {
   "id": "D6-p11-J8-K9",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    114,
    130
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "7"
  },
  {
   "id": "D6-p11-G9-F8",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    126,
    110
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "7"
  },
  {
   "id": "D6-p11-I9-G7",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    128,
    96
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "4"
  },
  {
   "id": "D6-p11-J9-F9",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    129,
    125
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "13"
  },
  {
   "id": "D6-p11-J9-I11",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    129,
    158
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "14"
  },
  {
   "id": "D6-p11-J9-J11",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    129,
    159
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 11,
   "printedPage": 5,
   "diagramLabel": "12"
  },
  {
   "id": "D7-p12-G7-J7",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    96,
    99
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 12,
   "printedPage": 6,
   "diagramLabel": "10"
  },
  {
   "id": "D7-p12-G7-G9",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    96,
    126
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 12,
   "printedPage": 6,
   "diagramLabel": "9"
  },
  {
   "id": "D7-p12-J7-I10",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    99,
    143
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 12,
   "printedPage": 6,
   "diagramLabel": "5"
  },
  {
   "id": "D7-p12-G8-J9",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    111,
    129
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 12,
   "printedPage": 6,
   "diagramLabel": "3"
  },
  {
   "id": "D7-p12-K8-J6",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    115,
    84
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 12,
   "printedPage": 6,
   "diagramLabel": "13"
  },
  {
   "id": "D7-p12-K8-G7",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    115,
    96
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 12,
   "printedPage": 6,
   "diagramLabel": "12"
  },
  {
   "id": "D7-p12-I9-G8",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    128,
    111
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 12,
   "printedPage": 6,
   "diagramLabel": "8"
  },
  {
   "id": "D7-p12-I9-K9",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    128,
    130
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 12,
   "printedPage": 6,
   "diagramLabel": "10"
  },
  {
   "id": "D7-p12-I9-G10",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    128,
    141
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 12,
   "printedPage": 6,
   "diagramLabel": "9"
  },
  {
   "id": "D7-p12-J9-G8",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    129,
    111
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 12,
   "printedPage": 6,
   "diagramLabel": "9"
  },
  {
   "id": "D7-p12-J9-F10",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    129,
    140
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 12,
   "printedPage": 6,
   "diagramLabel": "10"
  },
  {
   "id": "D7-p12-J9-H10",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    129,
    142
   ],
   "assessment": "equal-slight-black",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 12,
   "printedPage": 6,
   "diagramLabel": "8"
  },
  {
   "id": "D8-p13-H5-I5",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    67,
    68
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 13,
   "printedPage": 7,
   "diagramLabel": "10"
  },
  {
   "id": "D8-p13-I6-I8",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    83,
    113
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 13,
   "printedPage": 7,
   "diagramLabel": "9"
  },
  {
   "id": "D8-p13-I7-G6",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    98,
    81
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 13,
   "printedPage": 7,
   "diagramLabel": "7"
  },
  {
   "id": "D8-p13-I7-F8",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    98,
    110
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 13,
   "printedPage": 7,
   "diagramLabel": "9"
  },
  {
   "id": "D8-p13-I7-I10",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    98,
    143
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 13,
   "printedPage": 7,
   "diagramLabel": "8"
  },
  {
   "id": "D8-p13-J8-G10",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    114,
    141
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 13,
   "printedPage": 7,
   "diagramLabel": "7"
  },
  {
   "id": "D8-p13-I9-J9",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    128,
    129
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 13,
   "printedPage": 7,
   "diagramLabel": "4"
  },
  {
   "id": "D8-p13-J9-J7",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    129,
    99
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 13,
   "printedPage": 7,
   "diagramLabel": "7"
  },
  {
   "id": "D8-p13-I10-I9",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    143,
    128
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 13,
   "printedPage": 7,
   "diagramLabel": "5"
  },
  {
   "id": "D9-p14-J7-I6",
   "familyId": "D9",
   "title": "구월",
   "moves": [
    112,
    127,
    98,
    99,
    83
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 14,
   "printedPage": 8,
   "diagramLabel": "8"
  },
  {
   "id": "D9-p14-G9-G8",
   "familyId": "D9",
   "title": "구월",
   "moves": [
    112,
    127,
    98,
    126,
    111
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 14,
   "printedPage": 8,
   "diagramLabel": "3"
  },
  {
   "id": "D9-p14-G9-I9",
   "familyId": "D9",
   "title": "구월",
   "moves": [
    112,
    127,
    98,
    126,
    128
   ],
   "assessment": "equal-slight-black",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 14,
   "printedPage": 8,
   "diagramLabel": "2"
  },
  {
   "id": "D10-p14-G7-J8",
   "familyId": "D10",
   "title": "신월",
   "moves": [
    112,
    127,
    99,
    96,
    114
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 14,
   "printedPage": 8,
   "diagramLabel": "4"
  },
  {
   "id": "D10-p14-F9-I7",
   "familyId": "D10",
   "title": "신월",
   "moves": [
    112,
    127,
    99,
    125,
    98
   ],
   "assessment": "equal-slight-black",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 14,
   "printedPage": 8,
   "diagramLabel": "6"
  },
  {
   "id": "D10-p14-J9-H7",
   "familyId": "D10",
   "title": "신월",
   "moves": [
    112,
    127,
    99,
    129,
    97
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 14,
   "printedPage": 8,
   "diagramLabel": "10"
  },
  {
   "id": "D11-p15-H5-K8",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    67,
    115
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 15,
   "printedPage": 9,
   "diagramLabel": "8"
  },
  {
   "id": "D11-p15-H5-K9",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    67,
    130
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 15,
   "printedPage": 9,
   "diagramLabel": "7"
  },
  {
   "id": "D11-p15-I6-G8",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    83,
    111
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 15,
   "printedPage": 9,
   "diagramLabel": "12"
  },
  {
   "id": "D11-p15-I6-I8",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    83,
    113
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 15,
   "printedPage": 9,
   "diagramLabel": "13"
  },
  {
   "id": "D11-p15-I7-F6",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    98,
    80
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 15,
   "printedPage": 9,
   "diagramLabel": "8"
  },
  {
   "id": "D11-p15-I7-G6",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    98,
    81
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 15,
   "printedPage": 9,
   "diagramLabel": "7"
  },
  {
   "id": "D11-p15-J8-J9",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    114,
    129
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 15,
   "printedPage": 9,
   "diagramLabel": "12"
  },
  {
   "id": "D11-p15-I9-J6",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    128,
    84
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 15,
   "printedPage": 9,
   "diagramLabel": "4"
  },
  {
   "id": "D11-p15-I10-I6",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    143,
    83
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 15,
   "printedPage": 9,
   "diagramLabel": "2"
  },
  {
   "id": "D12-p16-F7-I9",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    95,
    128
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 16,
   "printedPage": 10,
   "diagramLabel": "4"
  },
  {
   "id": "D12-p16-J7-H6",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    99,
    82
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 16,
   "printedPage": 10,
   "diagramLabel": "11"
  },
  {
   "id": "D12-p16-J7-I7",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    99,
    98
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 16,
   "printedPage": 10,
   "diagramLabel": "8"
  },
  {
   "id": "D12-p16-J7-G8",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    99,
    111
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 16,
   "printedPage": 10,
   "diagramLabel": "10"
  },
  {
   "id": "D12-p16-J7-G9",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    99,
    126
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 16,
   "printedPage": 10,
   "diagramLabel": "9"
  },
  {
   "id": "D12-p16-J7-G10",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    99,
    141
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 16,
   "printedPage": 10,
   "diagramLabel": "7"
  },
  {
   "id": "D12-p16-F8-G7",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    110,
    96
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 16,
   "printedPage": 10,
   "diagramLabel": "9"
  },
  {
   "id": "D12-p16-F8-F9",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    110,
    125
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 16,
   "printedPage": 10,
   "diagramLabel": "10"
  },
  {
   "id": "D12-p16-J9-G10",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    129,
    141
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 16,
   "printedPage": 10,
   "diagramLabel": "10"
  },
  {
   "id": "D12-p16-I10-H6",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    143,
    82
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 16,
   "printedPage": 10,
   "diagramLabel": "3"
  },
  {
   "id": "D12-p17-G6-K6",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    81,
    85
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 17,
   "printedPage": 11,
   "diagramLabel": "11"
  },
  {
   "id": "D12-p17-G6-K8",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    81,
    115
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 17,
   "printedPage": 11,
   "diagramLabel": "12"
  },
  {
   "id": "D12-p17-G7-H6",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    96,
    82
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 17,
   "printedPage": 11,
   "diagramLabel": "11"
  },
  {
   "id": "D12-p17-G7-H7",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    96,
    97
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 17,
   "printedPage": 11,
   "diagramLabel": "13"
  },
  {
   "id": "D12-p17-G7-F9",
   "familyId": "D12",
   "title": "산월",
   "moves": [
    112,
    127,
    83,
    96,
    125
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 17,
   "printedPage": 11,
   "diagramLabel": "12"
  },
  {
   "id": "D13-p17-J8-K8",
   "familyId": "D13",
   "title": "직접 유성",
   "moves": [
    112,
    127,
    84,
    114,
    115
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 17,
   "printedPage": 11,
   "diagramLabel": "11"
  },
  {
   "id": "D13-p17-J8-I9",
   "familyId": "D13",
   "title": "직접 유성",
   "moves": [
    112,
    127,
    84,
    114,
    128
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 17,
   "printedPage": 11,
   "diagramLabel": "10"
  },
  {
   "id": "D13-p18-G7-H6",
   "familyId": "D13",
   "title": "직접 유성",
   "moves": [
    112,
    127,
    84,
    96,
    82
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 18,
   "printedPage": 12,
   "diagramLabel": "3"
  },
  {
   "id": "D13-p18-I7-I9",
   "familyId": "D13",
   "title": "직접 유성",
   "moves": [
    112,
    127,
    84,
    98,
    128
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 18,
   "printedPage": 12,
   "diagramLabel": "5"
  },
  {
   "id": "D13-p18-I9-H6",
   "familyId": "D13",
   "title": "직접 유성",
   "moves": [
    112,
    127,
    84,
    128,
    82
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 18,
   "printedPage": 12,
   "diagramLabel": "3"
  },
  {
   "id": "D13-p18-I9-J8",
   "familyId": "D13",
   "title": "직접 유성",
   "moves": [
    112,
    127,
    84,
    128,
    114
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 18,
   "printedPage": 12,
   "diagramLabel": "4"
  },
  {
   "id": "D13-p18-H10-I9",
   "familyId": "D13",
   "title": "직접 유성",
   "moves": [
    112,
    127,
    84,
    142,
    128
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 18,
   "printedPage": 12,
   "diagramLabel": "11"
  },
  {
   "id": "D13-p18-G11-I8",
   "familyId": "D13",
   "title": "직접 유성",
   "moves": [
    112,
    127,
    84,
    156,
    113
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 18,
   "printedPage": 12,
   "diagramLabel": "10"
  },
  {
   "id": "D13-p18-G11-G10",
   "familyId": "D13",
   "title": "직접 유성",
   "moves": [
    112,
    127,
    84,
    156,
    141
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 18,
   "printedPage": 12,
   "diagramLabel": "11"
  },
  {
   "id": "soosyrv-guide-20190701-I1-G7-H7",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    96,
    97
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 19,
   "printedPage": 13,
   "diagramLabel": "8"
  },
  {
   "id": "soosyrv-guide-20190701-I1-G7-J7",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    96,
    99
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 19,
   "printedPage": 13,
   "diagramLabel": "9"
  },
  {
   "id": "soosyrv-guide-20190701-I1-F9-I8",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    125,
    113
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 19,
   "printedPage": 13,
   "diagramLabel": "7"
  },
  {
   "id": "soosyrv-guide-20190701-I1-G9-I11",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    126,
    158
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 19,
   "printedPage": 13,
   "diagramLabel": "3"
  },
  {
   "id": "soosyrv-guide-20190701-I1-F10-K8",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    140,
    115
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 19,
   "printedPage": 13,
   "diagramLabel": "12"
  },
  {
   "id": "soosyrv-guide-20190701-I1-F10-F9",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    140,
    125
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 19,
   "printedPage": 13,
   "diagramLabel": "11"
  },
  {
   "id": "soosyrv-guide-20190701-I1-H10-J8",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    142,
    114
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 19,
   "printedPage": 13,
   "diagramLabel": "1"
  },
  {
   "id": "soosyrv-guide-20190701-I1-I10-I8",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    143,
    113
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 20,
   "printedPage": 14,
   "diagramLabel": "2"
  },
  {
   "id": "soosyrv-guide-20190701-I1-I10-I11",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    143,
    158
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 20,
   "printedPage": 14,
   "diagramLabel": "1"
  },
  {
   "id": "soosyrv-guide-20190701-I1-I11-I8",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    158,
    113
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 20,
   "printedPage": 14,
   "diagramLabel": "3"
  },
  {
   "id": "soosyrv-guide-20190701-I1-I11-G9",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    158,
    126
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 20,
   "printedPage": 14,
   "diagramLabel": "4"
  },
  {
   "id": "soosyrv-guide-20190701-I2-I7-H6",
   "familyId": "I2",
   "title": "협월",
   "moves": [
    112,
    128,
    129,
    98,
    82
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 20,
   "printedPage": 14,
   "diagramLabel": "9"
  },
  {
   "id": "soosyrv-guide-20190701-I2-K7-K6",
   "familyId": "I2",
   "title": "협월",
   "moves": [
    112,
    128,
    129,
    100,
    85
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 20,
   "printedPage": 14,
   "diagramLabel": "10"
  },
  {
   "id": "soosyrv-guide-20190701-I2-K7-J7",
   "familyId": "I2",
   "title": "협월",
   "moves": [
    112,
    128,
    129,
    100,
    99
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 20,
   "printedPage": 14,
   "diagramLabel": "9"
  },
  {
   "id": "soosyrv-guide-20190701-I2-J8-J7",
   "familyId": "I2",
   "title": "협월",
   "moves": [
    112,
    128,
    129,
    114,
    99
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 20,
   "printedPage": 14,
   "diagramLabel": "8"
  },
  {
   "id": "soosyrv-guide-20190701-I3-J7-H6",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    99,
    82
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 21,
   "printedPage": 15,
   "diagramLabel": "11"
  },
  {
   "id": "soosyrv-guide-20190701-I3-J7-K9",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    99,
    130
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 21,
   "printedPage": 15,
   "diagramLabel": "10"
  },
  {
   "id": "soosyrv-guide-20190701-I3-G9-G10",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    126,
    141
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 21,
   "printedPage": 15,
   "diagramLabel": "10"
  },
  {
   "id": "soosyrv-guide-20190701-I3-G9-H11",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    126,
    157
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 21,
   "printedPage": 15,
   "diagramLabel": "11"
  },
  {
   "id": "soosyrv-guide-20190701-I3-J9-H7",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    129,
    97
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 21,
   "printedPage": 15,
   "diagramLabel": "7"
  },
  {
   "id": "soosyrv-guide-20190701-I3-J9-I7",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    129,
    98
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 21,
   "printedPage": 15,
   "diagramLabel": "8"
  },
  {
   "id": "soosyrv-guide-20190701-I3-K9-G8",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    130,
    111
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 21,
   "printedPage": 15,
   "diagramLabel": "13"
  },
  {
   "id": "soosyrv-guide-20190701-I3-K9-L9",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    130,
    131
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 21,
   "printedPage": 15,
   "diagramLabel": "11"
  },
  {
   "id": "soosyrv-guide-20190701-I3-K9-I11",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    130,
    158
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 21,
   "printedPage": 15,
   "diagramLabel": "12"
  },
  {
   "id": "soosyrv-guide-20190701-I3-I10-F7",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    143,
    95
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 21,
   "printedPage": 15,
   "diagramLabel": "9"
  },
  {
   "id": "soosyrv-guide-20190701-I4-K7-I6",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    100,
    83
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 22,
   "printedPage": 16,
   "diagramLabel": "7"
  },
  {
   "id": "soosyrv-guide-20190701-I4-K7-L6",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    100,
    86
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 22,
   "printedPage": 16,
   "diagramLabel": "8"
  },
  {
   "id": "soosyrv-guide-20190701-I4-K7-J9",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    100,
    129
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 22,
   "printedPage": 16,
   "diagramLabel": "9"
  },
  {
   "id": "soosyrv-guide-20190701-I4-J8-J9",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    114,
    129
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 22,
   "printedPage": 16,
   "diagramLabel": "7"
  },
  {
   "id": "soosyrv-guide-20190701-I4-G9-H9",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    126,
    127
   ],
   "assessment": "equal-slight-black",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 22,
   "printedPage": 16,
   "diagramLabel": "8"
  },
  {
   "id": "soosyrv-guide-20190701-I4-H9-I8",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    127,
    113
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 22,
   "printedPage": 16,
   "diagramLabel": "7"
  },
  {
   "id": "soosyrv-guide-20190701-I4-J9-H7",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    129,
    97
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 22,
   "printedPage": 16,
   "diagramLabel": "8"
  },
  {
   "id": "soosyrv-guide-20190701-I5-H6-K9",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    82,
    130
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 23,
   "printedPage": 17,
   "diagramLabel": "6"
  },
  {
   "id": "soosyrv-guide-20190701-I5-H6-I10",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    82,
    143
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 23,
   "printedPage": 17,
   "diagramLabel": "5"
  },
  {
   "id": "soosyrv-guide-20190701-I5-G7-I7",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    96,
    98
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 23,
   "printedPage": 17,
   "diagramLabel": "10"
  },
  {
   "id": "soosyrv-guide-20190701-I5-J7-H7",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    99,
    97
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 23,
   "printedPage": 17,
   "diagramLabel": "8"
  },
  {
   "id": "soosyrv-guide-20190701-I5-J7-K8",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    99,
    115
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 23,
   "printedPage": 17,
   "diagramLabel": "9"
  },
  {
   "id": "soosyrv-guide-20190701-I5-K7-I8",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    100,
    113
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 23,
   "printedPage": 17,
   "diagramLabel": "6"
  },
  {
   "id": "soosyrv-guide-20190701-I5-J8-K9",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    114,
    130
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 23,
   "printedPage": 17,
   "diagramLabel": "4"
  },
  {
   "id": "soosyrv-guide-20190701-I5-G9-J9",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    126,
    129
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 23,
   "printedPage": 17,
   "diagramLabel": "1"
  },
  {
   "id": "soosyrv-guide-20190701-I5-I5-F8",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    68,
    110
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 24,
   "printedPage": 18,
   "diagramLabel": "10"
  },
  {
   "id": "soosyrv-guide-20190701-I5-K6-J7",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    85,
    99
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 24,
   "printedPage": 18,
   "diagramLabel": "11"
  },
  {
   "id": "soosyrv-guide-20190701-I5-K6-F8",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    85,
    110
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 24,
   "printedPage": 18,
   "diagramLabel": "12"
  },
  {
   "id": "soosyrv-guide-20190701-I5-K6-J9",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    85,
    129
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 24,
   "printedPage": 18,
   "diagramLabel": "13"
  },
  {
   "id": "soosyrv-guide-20190701-I5-K6-K9",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    85,
    130
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 24,
   "printedPage": 18,
   "diagramLabel": "14"
  },
  {
   "id": "soosyrv-guide-20190701-I5-G10-G8",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    141,
    111
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 24,
   "printedPage": 18,
   "diagramLabel": "6"
  },
  {
   "id": "soosyrv-guide-20190701-I5-I11-H7",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    158,
    97
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 24,
   "printedPage": 18,
   "diagramLabel": "10"
  },
  {
   "id": "soosyrv-guide-20190701-I6-J9-K8",
   "familyId": "I6",
   "title": "운월",
   "moves": [
    112,
    128,
    113,
    129,
    115
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 25,
   "printedPage": 19,
   "diagramLabel": "7"
  },
  {
   "id": "soosyrv-guide-20190701-I8-G9-G6",
   "familyId": "I8",
   "title": "람월",
   "moves": [
    112,
    128,
    83,
    126,
    81
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 26,
   "printedPage": 20,
   "diagramLabel": "4"
  },
  {
   "id": "soosyrv-guide-20190701-I8-I10-H6",
   "familyId": "I8",
   "title": "람월",
   "moves": [
    112,
    128,
    83,
    143,
    82
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 26,
   "printedPage": 20,
   "diagramLabel": "3"
  },
  {
   "id": "soosyrv-guide-20190701-I9-H6-I7",
   "familyId": "I9",
   "title": "은월",
   "moves": [
    112,
    128,
    97,
    82,
    98
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 27,
   "printedPage": 21,
   "diagramLabel": "10"
  },
  {
   "id": "soosyrv-guide-20190701-I9-J8-H10",
   "familyId": "I9",
   "title": "은월",
   "moves": [
    112,
    128,
    97,
    114,
    142
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 27,
   "printedPage": 21,
   "diagramLabel": "8"
  },
  {
   "id": "soosyrv-guide-20190701-I9-J9-J7",
   "familyId": "I9",
   "title": "은월",
   "moves": [
    112,
    128,
    97,
    129,
    99
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 27,
   "printedPage": 21,
   "diagramLabel": "10"
  },
  {
   "id": "soosyrv-guide-20190701-I9-J9-J8",
   "familyId": "I9",
   "title": "은월",
   "moves": [
    112,
    128,
    97,
    129,
    114
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 27,
   "printedPage": 21,
   "diagramLabel": "12"
  },
  {
   "id": "soosyrv-guide-20190701-I9-J9-K9",
   "familyId": "I9",
   "title": "은월",
   "moves": [
    112,
    128,
    97,
    129,
    130
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 27,
   "printedPage": 21,
   "diagramLabel": "11"
  },
  {
   "id": "soosyrv-guide-20190701-I10-J9-K9",
   "familyId": "I10",
   "title": "명성",
   "moves": [
    112,
    128,
    82,
    129,
    130
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 28,
   "printedPage": 22,
   "diagramLabel": "7"
  },
  {
   "id": "soosyrv-guide-20190701-I10-I10-I6",
   "familyId": "I10",
   "title": "명성",
   "moves": [
    112,
    128,
    82,
    143,
    83
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 28,
   "printedPage": 22,
   "diagramLabel": "7"
  },
  {
   "id": "soosyrv-guide-20190701-I11-I10-G9",
   "familyId": "I11",
   "title": "사월",
   "moves": [
    112,
    128,
    96,
    143,
    126
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 28,
   "printedPage": 22,
   "diagramLabel": "3"
  },
  {
   "id": "soosyrv-guide-20190701-I12-J7-I7",
   "familyId": "I12",
   "title": "명월",
   "moves": [
    112,
    128,
    81,
    99,
    98
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 29,
   "printedPage": 23,
   "diagramLabel": "4"
  },
  {
   "id": "soosyrv-guide-20190701-I12-J9-I7",
   "familyId": "I12",
   "title": "명월",
   "moves": [
    112,
    128,
    81,
    129,
    98
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 29,
   "printedPage": 23,
   "diagramLabel": "8"
  },
  {
   "id": "soosyrv-guide-20190701-I12-J9-H10",
   "familyId": "I12",
   "title": "명월",
   "moves": [
    112,
    128,
    81,
    129,
    142
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 29,
   "printedPage": 23,
   "diagramLabel": "7"
  },
  {
   "id": "soosyrv-guide-20190701-I12-G10-I8",
   "familyId": "I12",
   "title": "명월",
   "moves": [
    112,
    128,
    81,
    141,
    113
   ],
   "assessment": "equal-slight-white",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 29,
   "printedPage": 23,
   "diagramLabel": "7"
  },
  {
   "id": "soosyrv-guide-20190701-I13-J10-I6",
   "familyId": "I13",
   "title": "혜성",
   "moves": [
    112,
    128,
    80,
    144,
    83
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 30,
   "printedPage": 24,
   "diagramLabel": "4"
  },
  {
   "id": "soosyrv-guide-20190701-I13-G11-F8",
   "familyId": "I13",
   "title": "혜성",
   "moves": [
    112,
    128,
    80,
    156,
    110
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 30,
   "printedPage": 24,
   "diagramLabel": "4"
  },
  {
   "id": "soosyrv-guide-20190701-I13-I11-F8",
   "familyId": "I13",
   "title": "혜성",
   "moves": [
    112,
    128,
    80,
    158,
    110
   ],
   "assessment": "equal",
   "sourceId": "soosyrv-guide-20190701",
   "pdfPage": 30,
   "printedPage": 24,
   "diagramLabel": "2"
  },
  {
   "id": "tarannikov-20090829-I7-G9-F8-disputed",
   "familyId": "I7",
   "title": "포월",
   "moves": [
    112,
    128,
    98,
    126,
    110
   ],
   "assessment": "historical-equal-disputed",
   "sourceId": "tarannikov-yamaguchi-20090829",
   "section": "board20",
   "diagramLabel": "F8",
   "manualOnly": true
  },
  {
   "id": "shuxingge-20260403-p6-5",
   "familyId": "D1",
   "title": "한성",
   "moves": [
    112,
    127,
    142,
    143,
    110
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 6,
   "printedPage": 4,
   "diagramLabel": "5"
  },
  {
   "id": "shuxingge-20260403-p7-12",
   "familyId": "D1",
   "title": "한성",
   "moves": [
    112,
    127,
    142,
    144,
    98
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 7,
   "printedPage": 5,
   "diagramLabel": "12"
  },
  {
   "id": "shuxingge-20260403-p8-4",
   "familyId": "D1",
   "title": "한성",
   "moves": [
    112,
    127,
    142,
    128,
    125
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 8,
   "printedPage": 6,
   "diagramLabel": "4"
  },
  {
   "id": "shuxingge-20260403-p11-5",
   "familyId": "D1",
   "title": "한성",
   "moves": [
    112,
    127,
    142,
    113,
    129
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 11,
   "printedPage": 9,
   "diagramLabel": "5"
  },
  {
   "id": "shuxingge-20260403-p12-12",
   "familyId": "D1",
   "title": "한성",
   "moves": [
    112,
    127,
    142,
    114,
    99
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 12,
   "printedPage": 10,
   "diagramLabel": "12"
  },
  {
   "id": "shuxingge-20260403-p20-9",
   "familyId": "D2",
   "title": "계월",
   "moves": [
    112,
    127,
    143,
    113,
    114
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 20,
   "printedPage": 5,
   "diagramLabel": "9"
  },
  {
   "id": "shuxingge-20260403-p22-12",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    158,
    159
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 22,
   "printedPage": 1,
   "diagramLabel": "12"
  },
  {
   "id": "shuxingge-20260403-p22-13",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    158,
    145
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 22,
   "printedPage": 1,
   "diagramLabel": "13"
  },
  {
   "id": "shuxingge-20260403-p22-14",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    158,
    98
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 22,
   "printedPage": 1,
   "diagramLabel": "14"
  },
  {
   "id": "shuxingge-20260403-p25-6prime",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    143,
    129
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 25,
   "printedPage": 4,
   "diagramLabel": "6'"
  },
  {
   "id": "shuxingge-20260403-p26-7",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    126,
    157
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 26,
   "printedPage": 5,
   "diagramLabel": "7"
  },
  {
   "id": "shuxingge-20260403-p27-2",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    128,
    113
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 27,
   "printedPage": 6,
   "diagramLabel": "2"
  },
  {
   "id": "shuxingge-20260403-p28-5prime",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    129,
    141
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 28,
   "printedPage": 7,
   "diagramLabel": "5'"
  },
  {
   "id": "shuxingge-20260403-p28-7prime",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    129,
    114
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 28,
   "printedPage": 7,
   "diagramLabel": "7'"
  },
  {
   "id": "shuxingge-20260403-p28-8",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    129,
    125
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 28,
   "printedPage": 7,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p31-7",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    96,
    143
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 31,
   "printedPage": 10,
   "diagramLabel": "7"
  },
  {
   "id": "shuxingge-20260403-p32-11",
   "familyId": "D3",
   "title": "소성",
   "moves": [
    112,
    127,
    144,
    98,
    114
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 32,
   "printedPage": 11,
   "diagramLabel": "11"
  },
  {
   "id": "shuxingge-20260403-p36-7",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    143,
    144
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 36,
   "printedPage": 2,
   "diagramLabel": "7"
  },
  {
   "id": "shuxingge-20260403-p37-13",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    144,
    110
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 37,
   "printedPage": 3,
   "diagramLabel": "13"
  },
  {
   "id": "shuxingge-20260403-p37-14",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    144,
    125
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 37,
   "printedPage": 3,
   "diagramLabel": "14"
  },
  {
   "id": "shuxingge-20260403-p37-15",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    144,
    130
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 37,
   "printedPage": 3,
   "diagramLabel": "15"
  },
  {
   "id": "shuxingge-20260403-p37-16",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    144,
    145
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 37,
   "printedPage": 3,
   "diagramLabel": "16"
  },
  {
   "id": "shuxingge-20260403-p38-14",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    125,
    140
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 38,
   "printedPage": 4,
   "diagramLabel": "14"
  },
  {
   "id": "shuxingge-20260403-p39-13",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    126,
    142
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 39,
   "printedPage": 5,
   "diagramLabel": "13"
  },
  {
   "id": "shuxingge-20260403-p39-14",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    126,
    145
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 39,
   "printedPage": 5,
   "diagramLabel": "14"
  },
  {
   "id": "shuxingge-20260403-p42-8prime",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    114,
    160
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 42,
   "printedPage": 8,
   "diagramLabel": "8'"
  },
  {
   "id": "shuxingge-20260403-p42-11",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    114,
    110
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 42,
   "printedPage": 8,
   "diagramLabel": "11"
  },
  {
   "id": "shuxingge-20260403-p44-14",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    98,
    158
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 44,
   "printedPage": 10,
   "diagramLabel": "14"
  },
  {
   "id": "shuxingge-20260403-p44-15",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    98,
    97
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 44,
   "printedPage": 10,
   "diagramLabel": "15"
  },
  {
   "id": "shuxingge-20260403-p44-16",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    98,
    82
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 44,
   "printedPage": 10,
   "diagramLabel": "16"
  },
  {
   "id": "shuxingge-20260403-p44-17",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    98,
    85
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 44,
   "printedPage": 10,
   "diagramLabel": "17"
  },
  {
   "id": "shuxingge-20260403-p44-19",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    98,
    131
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 44,
   "printedPage": 10,
   "diagramLabel": "19"
  },
  {
   "id": "shuxingge-20260403-p44-20",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    98,
    116
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 44,
   "printedPage": 10,
   "diagramLabel": "20"
  },
  {
   "id": "shuxingge-20260403-p44-21",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    98,
    100
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 44,
   "printedPage": 10,
   "diagramLabel": "21"
  },
  {
   "id": "shuxingge-20260403-p44-22",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    98,
    160
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 44,
   "printedPage": 10,
   "diagramLabel": "22"
  },
  {
   "id": "shuxingge-20260403-p44-23",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    98,
    69
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 44,
   "printedPage": 10,
   "diagramLabel": "23"
  },
  {
   "id": "shuxingge-20260403-p44-24",
   "familyId": "D5",
   "title": "잔월",
   "moves": [
    112,
    127,
    129,
    98,
    159
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 44,
   "printedPage": 10,
   "diagramLabel": "24"
  },
  {
   "id": "shuxingge-20260403-p46-11",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    143,
    114
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 46,
   "printedPage": 1,
   "diagramLabel": "11"
  },
  {
   "id": "shuxingge-20260403-p48-4prime",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    128,
    99
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 48,
   "printedPage": 3,
   "diagramLabel": "4'"
  },
  {
   "id": "shuxingge-20260403-p48-5",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    128,
    144
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 48,
   "printedPage": 3,
   "diagramLabel": "5"
  },
  {
   "id": "shuxingge-20260403-p48-6",
   "familyId": "D6",
   "title": "우월",
   "moves": [
    112,
    127,
    113,
    128,
    110
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 48,
   "printedPage": 3,
   "diagramLabel": "6"
  },
  {
   "id": "shuxingge-20260403-p53-7",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    143,
    126
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 53,
   "printedPage": 1,
   "diagramLabel": "7"
  },
  {
   "id": "shuxingge-20260403-p53-8",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    143,
    113
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 53,
   "printedPage": 1,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p54-8",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    126,
    111
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 54,
   "printedPage": 2,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p56-8",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    129,
    144
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 56,
   "printedPage": 4,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p59-11",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    96,
    82
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 59,
   "printedPage": 7,
   "diagramLabel": "11"
  },
  {
   "id": "shuxingge-20260403-p62-6prime",
   "familyId": "D7",
   "title": "금성",
   "moves": [
    112,
    127,
    114,
    99,
    83
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 62,
   "printedPage": 10,
   "diagramLabel": "6'"
  },
  {
   "id": "shuxingge-20260403-p65-6",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    129,
    141
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 65,
   "printedPage": 3,
   "diagramLabel": "6"
  },
  {
   "id": "shuxingge-20260403-p67-6",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    114,
    98
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 67,
   "printedPage": 5,
   "diagramLabel": "6"
  },
  {
   "id": "shuxingge-20260403-p68-8",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    98,
    129
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 68,
   "printedPage": 6,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p70-4",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    82,
    68
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 70,
   "printedPage": 8,
   "diagramLabel": "4"
  },
  {
   "id": "shuxingge-20260403-p70-4prime",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    82,
    143
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 70,
   "printedPage": 8,
   "diagramLabel": "4'"
  },
  {
   "id": "shuxingge-20260403-p71-10",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    83,
    82
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 71,
   "printedPage": 9,
   "diagramLabel": "10"
  },
  {
   "id": "shuxingge-20260403-p71-11",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    83,
    67
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 71,
   "printedPage": 9,
   "diagramLabel": "11"
  },
  {
   "id": "shuxingge-20260403-p71-12",
   "familyId": "D8",
   "title": "송월",
   "moves": [
    112,
    127,
    97,
    83,
    143
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 71,
   "printedPage": 9,
   "diagramLabel": "12"
  },
  {
   "id": "shuxingge-20260403-p73-9",
   "familyId": "D9",
   "title": "구월",
   "moves": [
    112,
    127,
    98,
    141,
    95
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 73,
   "printedPage": 1,
   "diagramLabel": "9"
  },
  {
   "id": "shuxingge-20260403-p77-8prime",
   "familyId": "D9",
   "title": "구월",
   "moves": [
    112,
    127,
    98,
    99,
    142
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 77,
   "printedPage": 5,
   "diagramLabel": "8'"
  },
  {
   "id": "shuxingge-20260403-p77-9",
   "familyId": "D9",
   "title": "구월",
   "moves": [
    112,
    127,
    98,
    99,
    111
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 77,
   "printedPage": 5,
   "diagramLabel": "9"
  },
  {
   "id": "shuxingge-20260403-p79-3",
   "familyId": "D10",
   "title": "신월",
   "moves": [
    112,
    127,
    99,
    143,
    96
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 79,
   "printedPage": 2,
   "diagramLabel": "3"
  },
  {
   "id": "shuxingge-20260403-p81-3",
   "familyId": "D10",
   "title": "신월",
   "moves": [
    112,
    127,
    99,
    126,
    125
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 81,
   "printedPage": 4,
   "diagramLabel": "3",
   "assessmentConflict": {
    "sourceId": "soosyrv-guide-20190701",
    "date": "2019-07-01",
    "pdfPage": 14,
    "printedPage": 8,
    "diagramLabel": "3",
    "assessment": "black-advantage",
    "summary": "2019 자료는 선공 우세, 2026 자료는 같은 수를 평형으로 평가합니다."
   }
  },
  {
   "id": "shuxingge-20260403-p87-3",
   "familyId": "D10",
   "title": "신월",
   "moves": [
    112,
    127,
    99,
    96,
    67
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 87,
   "printedPage": 10,
   "diagramLabel": "3"
  },
  {
   "id": "shuxingge-20260403-p92-3",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    128,
    129
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 92,
   "printedPage": 5,
   "diagramLabel": "3"
  },
  {
   "id": "shuxingge-20260403-p97-8",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    98,
    129
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 97,
   "printedPage": 10,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p97-9",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    98,
    110
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 97,
   "printedPage": 10,
   "diagramLabel": "9"
  },
  {
   "id": "shuxingge-20260403-p100-8",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    67,
    142
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 100,
   "printedPage": 13,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p100-9",
   "familyId": "D11",
   "title": "서성",
   "moves": [
    112,
    127,
    82,
    67,
    144
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 100,
   "printedPage": 13,
   "diagramLabel": "9"
  },
  {
   "id": "shuxingge-20260403-p115-10",
   "familyId": "D13",
   "title": "직접 유성",
   "moves": [
    112,
    127,
    84,
    142,
    125
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 115,
   "printedPage": 3,
   "diagramLabel": "10"
  },
  {
   "id": "shuxingge-20260403-p131-10",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    160,
    145
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 131,
   "printedPage": 6,
   "diagramLabel": "10"
  },
  {
   "id": "shuxingge-20260403-p132-3",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    141,
    126
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 132,
   "printedPage": 7,
   "diagramLabel": "3"
  },
  {
   "id": "shuxingge-20260403-p134-2",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    143,
    126
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 134,
   "printedPage": 9,
   "diagramLabel": "2"
  },
  {
   "id": "shuxingge-20260403-p136-3",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    126,
    156
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 136,
   "printedPage": 11,
   "diagramLabel": "3"
  },
  {
   "id": "shuxingge-20260403-p139-9",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    96,
    116
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 139,
   "printedPage": 14,
   "diagramLabel": "9"
  },
  {
   "id": "shuxingge-20260403-p139-11",
   "familyId": "I1",
   "title": "장성",
   "moves": [
    112,
    128,
    144,
    96,
    146
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 139,
   "printedPage": 14,
   "diagramLabel": "11"
  },
  {
   "id": "shuxingge-20260403-p145-11",
   "familyId": "I2",
   "title": "협월",
   "moves": [
    112,
    128,
    129,
    98,
    157
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 145,
   "printedPage": 6,
   "diagramLabel": "11"
  },
  {
   "id": "shuxingge-20260403-p145-12",
   "familyId": "I2",
   "title": "협월",
   "moves": [
    112,
    128,
    129,
    98,
    145
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 145,
   "printedPage": 6,
   "diagramLabel": "12"
  },
  {
   "id": "shuxingge-20260403-p147-11",
   "familyId": "I2",
   "title": "협월",
   "moves": [
    112,
    128,
    129,
    100,
    110
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 147,
   "printedPage": 8,
   "diagramLabel": "11"
  },
  {
   "id": "shuxingge-20260403-p148-8",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    143,
    66
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 148,
   "printedPage": 1,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p148-9",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    143,
    159
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 148,
   "printedPage": 1,
   "diagramLabel": "9"
  },
  {
   "id": "shuxingge-20260403-p148-10",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    143,
    145
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 148,
   "printedPage": 1,
   "diagramLabel": "10"
  },
  {
   "id": "shuxingge-20260403-p151-7",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    129,
    131
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 151,
   "printedPage": 4,
   "diagramLabel": "7"
  },
  {
   "id": "shuxingge-20260403-p155-6",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    115,
    145
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 155,
   "printedPage": 8,
   "diagramLabel": "6"
  },
  {
   "id": "shuxingge-20260403-p155-7",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    115,
    97
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 155,
   "printedPage": 8,
   "diagramLabel": "7"
  },
  {
   "id": "shuxingge-20260403-p155-8",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    115,
    130
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 155,
   "printedPage": 8,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p155-9",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    115,
    82
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 155,
   "printedPage": 8,
   "diagramLabel": "9"
  },
  {
   "id": "shuxingge-20260403-p155-10",
   "familyId": "I3",
   "title": "항성",
   "moves": [
    112,
    128,
    114,
    115,
    110
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 155,
   "printedPage": 8,
   "diagramLabel": "10"
  },
  {
   "id": "shuxingge-20260403-p158-9",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    142,
    156
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 158,
   "printedPage": 1,
   "diagramLabel": "9"
  },
  {
   "id": "shuxingge-20260403-p158-10",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    142,
    143
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 158,
   "printedPage": 1,
   "diagramLabel": "10"
  },
  {
   "id": "shuxingge-20260403-p158-11",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    142,
    82
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 158,
   "printedPage": 1,
   "diagramLabel": "11"
  },
  {
   "id": "shuxingge-20260403-p166-8",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    114,
    83
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 166,
   "printedPage": 9,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p168-8",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    100,
    84
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 168,
   "printedPage": 11,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p168-9",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    100,
    111
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 168,
   "printedPage": 11,
   "diagramLabel": "9"
  },
  {
   "id": "shuxingge-20260403-p168-11",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    100,
    158
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 168,
   "printedPage": 11,
   "diagramLabel": "11"
  },
  {
   "id": "shuxingge-20260403-p169-10",
   "familyId": "I4",
   "title": "수월",
   "moves": [
    112,
    128,
    99,
    83,
    110
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 169,
   "printedPage": 12,
   "diagramLabel": "10"
  },
  {
   "id": "shuxingge-20260403-p171-8",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    141,
    81
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 171,
   "printedPage": 2,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p176-6",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    129,
    116
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 176,
   "printedPage": 7,
   "diagramLabel": "6"
  },
  {
   "id": "shuxingge-20260403-p176-7",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    129,
    85
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 176,
   "printedPage": 7,
   "diagramLabel": "7"
  },
  {
   "id": "shuxingge-20260403-p178-10",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    110,
    99
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 178,
   "printedPage": 9,
   "diagramLabel": "10"
  },
  {
   "id": "shuxingge-20260403-p178-11",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    110,
    127
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 178,
   "printedPage": 9,
   "diagramLabel": "11"
  },
  {
   "id": "shuxingge-20260403-p178-12",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    110,
    116
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 178,
   "printedPage": 9,
   "diagramLabel": "12"
  },
  {
   "id": "shuxingge-20260403-p186-6",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    100,
    143
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 186,
   "printedPage": 17,
   "diagramLabel": "6"
  },
  {
   "id": "shuxingge-20260403-p186-7",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    100,
    130
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 186,
   "printedPage": 17,
   "diagramLabel": "7"
  },
  {
   "id": "shuxingge-20260403-p187-5",
   "familyId": "I5",
   "title": "간접 유성",
   "moves": [
    112,
    128,
    84,
    82,
    114
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 187,
   "printedPage": 18,
   "diagramLabel": "5"
  },
  {
   "id": "shuxingge-20260403-p194-13",
   "familyId": "I6",
   "title": "운월",
   "moves": [
    112,
    128,
    113,
    98,
    115
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 194,
   "printedPage": 7,
   "diagramLabel": "13"
  },
  {
   "id": "shuxingge-20260403-p194-14",
   "familyId": "I6",
   "title": "운월",
   "moves": [
    112,
    128,
    113,
    98,
    141
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 194,
   "printedPage": 7,
   "diagramLabel": "14"
  },
  {
   "id": "shuxingge-20260403-p199-9",
   "familyId": "I8",
   "title": "람월",
   "moves": [
    112,
    128,
    83,
    158,
    67
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 199,
   "printedPage": 1,
   "diagramLabel": "9"
  },
  {
   "id": "shuxingge-20260403-p202-5",
   "familyId": "I8",
   "title": "람월",
   "moves": [
    112,
    128,
    83,
    126,
    67
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 202,
   "printedPage": 4,
   "diagramLabel": "5"
  },
  {
   "id": "shuxingge-20260403-p204-8",
   "familyId": "I8",
   "title": "람월",
   "moves": [
    112,
    128,
    83,
    129,
    115
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 204,
   "printedPage": 6,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p206-7",
   "familyId": "I8",
   "title": "람월",
   "moves": [
    112,
    128,
    83,
    114,
    99
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 206,
   "printedPage": 8,
   "diagramLabel": "7"
  },
  {
   "id": "shuxingge-20260403-p212-8",
   "familyId": "I9",
   "title": "은월",
   "moves": [
    112,
    128,
    97,
    114,
    110
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 212,
   "printedPage": 6,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p231-8",
   "familyId": "I12",
   "title": "명월",
   "moves": [
    112,
    128,
    81,
    141,
    84
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 231,
   "printedPage": 2,
   "diagramLabel": "8"
  },
  {
   "id": "shuxingge-20260403-p242-10",
   "familyId": "I12",
   "title": "명월",
   "moves": [
    112,
    128,
    81,
    100,
    143
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 242,
   "printedPage": 13,
   "diagramLabel": "10"
  },
  {
   "id": "shuxingge-20260403-p246-7",
   "familyId": "I13",
   "title": "혜성",
   "moves": [
    112,
    128,
    80,
    140,
    95
   ],
   "assessment": "equal",
   "sourceId": "shuxingge-guide-20260403",
   "pdfPage": 246,
   "printedPage": 4,
   "diagramLabel": "7"
  }
 ],
 "manualChoicesOnly": true,
 "policy": "Additional manual fifth choices; the existing automatic opening recommendation is unchanged."
};
if(typeof module!=='undefined')module.exports=OmokBalancedOpeningData;
