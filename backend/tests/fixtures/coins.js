const coinFixtures = {
  validCoin: {
    _id: 'ric_1_aug_10',
    title: { en: 'RIC I (second edition) Augustus 10' },
    reference: { system: 'RIC', series: 'ric_i', number: 10, suffix: '' },
    references: [{ system: 'RIC', series: 'ric_i', number: 10, suffix: '' }],
    coinage: { date: { from: -25, to: -23 } },
    authority: { issuer: 'augustus', dynasty: 'julio_claudian' },
    classification: { denomination: 'denarius', material: 'silver', mint: 'emerita' },
    descriptions: {
      obverse: { legend: 'IMP CAESAR AVGVSTVS', type: 'Head of Augustus, bare, right', portrait: 'Augustus' },
      reverse: { legend: 'P CARISIVS LEG PRO PR EMERITA', type: 'City wall, gateway' }
    },
    subjects: ['bust', 'head'],
    images: [
      {
        index: 1, layout: 'split', license: 'Public Domain',
        source: 'test', copyright_holder: 'Test Museum',
        files: { obverse: 'https://example.com/obv.jpg', reverse: 'https://example.com/rev.jpg' }
      }
    ],
    source_ocre_url: 'https://numismatics.org/ocre/id/ric.1(2).aug.10'
  },

  validCoinRIC8: {
    _id: 'ric_8_alex_77',
    title: { en: 'RIC VIII Alexandria 77' },
    reference: { system: 'RIC', series: 'ric_viii', number: 77, suffix: '' },
    references: [{ system: 'RIC', series: 'ric_viii', number: 77, suffix: '' }],
    coinage: { date: { from: 351, to: 355 } },
    authority: { issuer: 'constantius_ii', dynasty: 'constantinian' },
    classification: { denomination: 'ae2', material: 'billon', mint: 'alexandria' },
    descriptions: {
      obverse: { legend: 'D N CONSTANTI-VS NOB CAES', type: 'Bust of Constantius Gallus', portrait: 'Constantius Gallus' },
      reverse: { legend: 'FEL TEMP RE-PARATIO', type: 'Soldier advancing left' }
    },
    subjects: ['soldier', 'bust'],
    images: [],
    source_ocre_url: 'https://numismatics.org/ocre/id/ric.8.alex.77'
  },

  invalidCoin: {
    // Missing required title.en
    authority: { issuer: 'test_issuer' }
  },

  multipleCoinsBatch: [
    {
      _id: 'ric_1_aug_100',
      title: { en: 'RIC I Augustus 100' },
      reference: { system: 'RIC', series: 'ric_i', number: 100, suffix: '' },
      references: [],
      coinage: { date: { from: -27, to: 14 } },
      authority: { issuer: 'augustus', dynasty: 'julio_claudian' },
      classification: { material: 'silver', denomination: 'denarius' },
      descriptions: {
        obverse: { legend: 'Test Legend 1', type: '', portrait: '' },
        reverse: { legend: 'Test Reverse 1', type: '' }
      },
      subjects: [],
      images: []
    },
    {
      _id: 'ric_8_alex_50',
      title: { en: 'RIC VIII Alexandria 50' },
      reference: { system: 'RIC', series: 'ric_viii', number: 50, suffix: '' },
      references: [],
      coinage: { date: { from: 351, to: 355 } },
      authority: { issuer: 'constantius_ii', dynasty: 'constantinian' },
      classification: { material: 'bronze', denomination: 'ae2', mint: 'alexandria' },
      descriptions: {
        obverse: { legend: 'Test Legend 2', type: '', portrait: '' },
        reverse: { legend: 'Test Reverse 2', type: '' }
      },
      subjects: [],
      images: []
    },
    {
      _id: 'ric_2_tra_77',
      title: { en: 'RIC II Trajan 77' },
      reference: { system: 'RIC', series: 'ric_ii', number: 77, suffix: '' },
      references: [],
      coinage: { date: { from: 98, to: 117 } },
      authority: { issuer: 'trajan', dynasty: 'nerva_antonine' },
      classification: { material: 'gold', denomination: 'aureus' },
      descriptions: {
        obverse: { legend: 'Test Legend 3', type: '', portrait: '' },
        reverse: { legend: 'Test Reverse 3', type: '' }
      },
      subjects: [],
      images: []
    }
  ]
};

module.exports = coinFixtures;
