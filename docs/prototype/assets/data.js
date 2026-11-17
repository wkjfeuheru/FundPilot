/* ============================================================
   FundPilot 原型 · 演示数据（全部为虚构模拟数据）
   本期新增：策略库 / SAA-TAA / 基金池 / 三级组合 / KYC 匹配
   ============================================================ */
window.FP_DATA = {
  /* ----------------------------- 基金池 ----------------------------- */
  funds: [
    {
      code: '000311', name: '景顺长城沪深300增强', type: '权益', risk: 'R4',
      ret: '+12.84%', net: '2.1863', unit: '股票指数',
      style: '大盘成长', company: '景顺长城基金', manager: '黎海威',
      liquidity: '开放申购', rating: 'A+', size: '86 亿',
      desc: '跟踪沪深300指数并叠加量化增强策略，权益仓位较高，净值波动与市场相关性较强。',
      fee: { buy: '0.15%', redeem: '0.50%', manage: '1.20%' },
      vol: '18.6%', drawdown: '-22.4%',
      navs: [1.62, 1.68, 1.66, 1.74, 1.81, 1.78, 1.92, 2.01, 1.96, 2.08, 2.14, 2.19]
    },
    {
      code: '110027', name: '易方达安心回报债券', type: '债券', risk: 'R2',
      ret: '+4.86%', net: '1.9738', unit: '纯债 / 偏债',
      style: '中长久期信用债', company: '易方达基金', manager: '胡剑',
      liquidity: '开放申购', rating: 'A+', size: '128 亿',
      desc: '以中高等级信用债与利率债为主，适度参与权益资产，追求相对稳定的长期回报。',
      fee: { buy: '0.08%', redeem: '0.10%', manage: '0.60%' },
      vol: '3.9%', drawdown: '-4.1%',
      navs: [1.82, 1.84, 1.86, 1.87, 1.89, 1.9, 1.92, 1.93, 1.95, 1.96, 1.97, 1.97]
    },
    {
      code: '000216', name: '华安黄金ETF联接A', type: '黄金', risk: 'R4',
      ret: '+9.52%', net: '1.8620', unit: '商品型',
      style: '黄金', company: '华安基金', manager: '许之彦',
      liquidity: '开放申购', rating: 'A', size: '64 亿',
      desc: '通过投资黄金 ETF 紧密跟踪金价走势，可用于组合多元化，但同样存在较大波动。',
      fee: { buy: '0.60%', redeem: '0.50%', manage: '0.50%' },
      vol: '12.8%', drawdown: '-13.7%',
      navs: [1.55, 1.58, 1.62, 1.6, 1.66, 1.7, 1.68, 1.74, 1.79, 1.81, 1.85, 1.86]
    },
    {
      code: '000198', name: '天弘余额宝货币', type: '货币', risk: 'R1',
      ret: '+1.65%', net: '1.0000', unit: '货币市场',
      style: '现金管理', company: '天弘基金', manager: '王登峰',
      liquidity: '开放申购', rating: 'A+', size: '7,200 亿',
      desc: '投资于短期货币市场工具，流动性较高，收益波动小，适合作为现金管理工具。',
      fee: { buy: '0%', redeem: '0%', manage: '0.30%' },
      vol: '0.2%', drawdown: '0.0%',
      navs: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    {
      code: '005827', name: '易方达蓝筹精选混合', type: '权益', risk: 'R4',
      ret: '+7.31%', net: '1.9741', unit: '主动权益',
      style: '大盘价值', company: '易方达基金', manager: '张坤',
      liquidity: '限购', redeemStatus: '暂停赎回', rating: 'A', size: '420 亿',
      desc: '自下而上精选具备竞争优势的蓝筹公司，行业集中度相对较高，需关注回撤风险。',
      fee: { buy: '0.15%', redeem: '0.50%', manage: '1.50%' },
      vol: '21.3%', drawdown: '-27.6%',
      navs: [1.7, 1.76, 1.72, 1.8, 1.84, 1.79, 1.88, 1.95, 1.9, 1.99, 2.03, 1.97]
    },
    {
      code: '003567', name: '招商招财通理财债券', type: '债券', risk: 'R2',
      ret: '+3.94%', net: '1.1562', unit: '中短债',
      style: '短久期', company: '招商基金', manager: '马龙',
      liquidity: '开放申购', rating: 'A', size: '58 亿',
      desc: '以中短久期信用债为主要投资标的，波动较低，适合作为组合的稳健底仓。',
      fee: { buy: '0.05%', redeem: '0.10%', manage: '0.40%' },
      vol: '2.6%', drawdown: '-2.8%',
      navs: [1.1, 1.11, 1.12, 1.13, 1.13, 1.14, 1.14, 1.15, 1.15, 1.15, 1.16, 1.16]
    },
    {
      code: '001316', name: '工银瑞信双利债券A', type: '债券', risk: 'R2',
      poolOnly: true,
      ret: '+4.12%', net: '1.5420', unit: '混合债券',
      style: '中短债', company: '工银瑞信基金', manager: '何秀红',
      liquidity: '开放申购', rating: 'A', size: '45 亿',
      desc: '以中短久期信用债为主，适度参与可转债增强收益，波动与回撤相对可控。',
      fee: { buy: '0.08%', redeem: '0.10%', manage: '0.60%' },
      vol: '3.6%', drawdown: '-3.9%',
      navs: [1.38, 1.4, 1.41, 1.43, 1.44, 1.45, 1.47, 1.48, 1.49, 1.51, 1.52, 1.54]
    },
    {
      code: '000032', name: '易方达信用债A', type: '债券', risk: 'R2',
      poolOnly: true,
      ret: '+3.68%', net: '1.2370', unit: '纯债',
      style: '中高等级信用债', company: '易方达基金', manager: '王晓晨',
      liquidity: '开放申购', rating: 'A+', size: '78 亿',
      desc: '以中高等级信用债为主要投资标的，久期灵活，适合作为组合的稳健底仓。',
      fee: { buy: '0.08%', redeem: '0.10%', manage: '0.50%' },
      vol: '2.9%', drawdown: '-3.1%',
      navs: [1.08, 1.1, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.18, 1.2, 1.22, 1.24]
    },
    {
      code: '001938', name: '中欧时代先锋股票A', type: '权益', risk: 'R4',
      ret: '+9.87%', net: '2.4310', unit: '主动权益',
      style: '成长', company: '中欧基金', manager: '周应波',
      liquidity: '开放申购', rating: 'B+', size: '96 亿',
      desc: '聚焦科技与先进制造等成长行业，弹性较高，需承担较大的净值波动。',
      fee: { buy: '0.15%', redeem: '0.50%', manage: '1.50%' },
      vol: '24.1%', drawdown: '-30.2%',
      navs: [1.98, 2.06, 2.02, 2.12, 2.2, 2.14, 2.26, 2.33, 2.27, 2.38, 2.47, 2.43]
    },
    {
      code: '000961', name: '天弘沪深300ETF联接A', type: '权益', risk: 'R4',
      ret: '+10.12%', net: '1.6842', unit: '指数基金',
      style: '宽基指数', company: '天弘基金', manager: '张子法',
      liquidity: '开放申购', rating: 'A', size: '152 亿',
      desc: '以低成本方式跟踪沪深300指数，适合作为权益核心仓位与战术调整工具。',
      fee: { buy: '0.10%', redeem: '0.50%', manage: '0.50%' },
      vol: '17.9%', drawdown: '-21.8%',
      navs: [1.42, 1.47, 1.45, 1.52, 1.58, 1.55, 1.66, 1.72, 1.69, 1.77, 1.73, 1.68]
    },
    {
      code: '160119', name: '南方中证500ETF联接A', type: '权益', risk: 'R4',
      poolOnly: true,
      ret: '+8.46%', net: '1.8420', unit: '指数基金',
      style: '中盘成长', company: '南方基金', manager: '罗文杰',
      liquidity: '开放申购', rating: 'A', size: '62 亿',
      desc: '跟踪中证500指数，覆盖中盘成长风格，波动高于沪深300，适合作为权益卫星仓位。',
      fee: { buy: '0.10%', redeem: '0.50%', manage: '0.60%' },
      vol: '20.4%', drawdown: '-25.3%',
      navs: [1.55, 1.6, 1.58, 1.66, 1.72, 1.68, 1.79, 1.86, 1.82, 1.9, 1.87, 1.84]
    },
    {
      code: '002611', name: '博时黄金ETF联接C', type: '黄金', risk: 'R4',
      poolOnly: true,
      ret: '+9.18%', net: '1.4210', unit: '商品型',
      style: '黄金', company: '博时基金', manager: '王祥',
      liquidity: '开放申购', rating: 'A', size: '88 亿',
      desc: '通过黄金 ETF 跟踪金价，C 类份额无申购费，适合作为组合多元化与战术配置工具。',
      fee: { buy: '0%', redeem: '0%', manage: '0.50%' },
      vol: '12.6%', drawdown: '-13.2%',
      navs: [1.2, 1.23, 1.26, 1.25, 1.3, 1.33, 1.31, 1.36, 1.4, 1.42, 1.45, 1.42]
    }
  ],

  /* ----------------------------- 策略库 ----------------------------- */
  strategies: [
    {
      id: 'S-2026-01', name: '稳健增值 03 号', category: '稳健增值', risk: 'R2',
      styles: ['红利', '低波'], goal: '稳健增值', minHorizon: 3, liquidity: '中', minInvestment: 10000,
      rating: 4.6, score: 86, status: '在售', clients: 86, aum: '¥8.6亿', reviewedAt: '2026/10/31',
      metrics: { ret: '+5.6%', vol: '5.2%', drawdown: '-6.8%', sharpe: '0.92', capacity: '12 亿', fee: '0.45%' },
      scores: { ret: 78, vol: 84, drawdown: 86, sharpe: 82, stability: 88, capacity: 80, fee: 76 },
      saa: [20, 65, 10, 5], ranges: [[15, 25], [55, 72], [5, 15], [0, 10]], taa: [22, 62, 11, 5],
      desc: '以中高等级信用债为底仓，叠加红利低波权益与黄金分散，追求低波动稳健增值。',
      funds: [
        { code: '110027', weight: 25, role: '核心' },
        { code: '003567', weight: 25, role: '核心' },
        { code: '001316', weight: 15, role: '核心' },
        { code: '000198', weight: 10, role: '流动性' },
        { code: '000311', weight: 10, role: '卫星' },
        { code: '000961', weight: 10, role: '卫星' },
        { code: '000216', weight: 5, role: '卫星' }
      ]
    },
    {
      id: 'S-2026-02', name: '均衡增长 01 号', category: '均衡增长', risk: 'R3',
      styles: ['均衡', '多资产'], goal: '均衡增长', minHorizon: 4, liquidity: '中', minInvestment: 10000,
      rating: 4.4, score: 82, status: '在售', clients: 118, aum: '¥12.4亿', reviewedAt: '2026/10/31',
      metrics: { ret: '+7.5%', vol: '9.8%', drawdown: '-12.6%', sharpe: '0.78', capacity: '25 亿', fee: '0.62%' },
      scores: { ret: 84, vol: 72, drawdown: 74, sharpe: 78, stability: 76, capacity: 82, fee: 70 },
      saa: [40, 45, 10, 5], ranges: [[32, 48], [38, 52], [5, 15], [0, 10]], taa: [43, 42, 10, 5],
      desc: '股债均衡配置，权益部分兼顾宽基与主动管理，适合中等风险承受能力的长期资金。',
      funds: [
        { code: '000311', weight: 15, role: '核心' },
        { code: '000961', weight: 15, role: '核心' },
        { code: '005827', weight: 10, role: '卫星' },
        { code: '110027', weight: 25, role: '核心' },
        { code: '003567', weight: 20, role: '核心' },
        { code: '000198', weight: 10, role: '流动性' },
        { code: '000216', weight: 5, role: '卫星' }
      ]
    },
    {
      id: 'S-2026-03', name: '积极成长 02 号', category: '积极成长', risk: 'R4',
      styles: ['成长'], goal: '积极成长', minHorizon: 5, liquidity: '低', minInvestment: 10000,
      rating: 4.2, score: 78, status: '在售', clients: 64, aum: '¥6.2亿', reviewedAt: '2026/10/31',
      metrics: { ret: '+11.2%', vol: '14.5%', drawdown: '-21.8%', sharpe: '0.72', capacity: '18 亿', fee: '0.78%' },
      scores: { ret: 92, vol: 58, drawdown: 56, sharpe: 74, stability: 62, capacity: 78, fee: 64 },
      saa: [60, 30, 5, 5], ranges: [[50, 70], [22, 38], [2, 8], [0, 8]], taa: [64, 26, 5, 5],
      desc: '以成长风格权益为主，通过主动权益与宽基指数搭配追求长期资本增值，波动较高。',
      funds: [
        { code: '000311', weight: 20, role: '核心' },
        { code: '005827', weight: 20, role: '核心' },
        { code: '001938', weight: 20, role: '卫星' },
        { code: '110027', weight: 15, role: '核心' },
        { code: '003567', weight: 15, role: '核心' },
        { code: '000198', weight: 5, role: '流动性' },
        { code: '000216', weight: 5, role: '卫星' }
      ]
    },
    {
      id: 'S-2026-04', name: '红利低波 05 号', category: '稳健增值', risk: 'R2',
      styles: ['红利', '低波'], goal: '稳健增值', minHorizon: 3, liquidity: '中', minInvestment: 5000,
      rating: 4.5, score: 84, status: '在售', clients: 42, aum: '¥4.8亿', reviewedAt: '2026/10/31',
      metrics: { ret: '+6.1%', vol: '6.4%', drawdown: '-8.2%', sharpe: '0.88', capacity: '10 亿', fee: '0.48%' },
      scores: { ret: 80, vol: 80, drawdown: 82, sharpe: 84, stability: 86, capacity: 74, fee: 78 },
      saa: [25, 60, 10, 5], ranges: [[18, 32], [52, 68], [5, 15], [0, 10]], taa: [27, 58, 10, 5],
      desc: '以红利低波资产为核心，控制权益波动并获取稳定股息，适合稳健型长期资金。',
      funds: [
        { code: '110027', weight: 20, role: '核心' },
        { code: '003567', weight: 20, role: '核心' },
        { code: '001316', weight: 20, role: '核心' },
        { code: '000311', weight: 15, role: '核心' },
        { code: '000961', weight: 10, role: '卫星' },
        { code: '000198', weight: 10, role: '流动性' },
        { code: '000216', weight: 5, role: '卫星' }
      ]
    },
    {
      id: 'S-2026-05', name: '固收增强 07 号', category: '固收+', risk: 'R2',
      styles: ['固收+', '低波'], goal: '固收+', minHorizon: 2, liquidity: '中', minInvestment: 5000,
      rating: 4.3, score: 80, status: '在售', clients: 31, aum: '¥9.1亿', reviewedAt: '2026/10/31',
      metrics: { ret: '+3.9%', vol: '4.6%', drawdown: '-4.6%', sharpe: '0.81', capacity: '20 亿', fee: '0.38%' },
      scores: { ret: 66, vol: 88, drawdown: 90, sharpe: 76, stability: 86, capacity: 84, fee: 82 },
      saa: [10, 78, 8, 4], ranges: [[5, 15], [72, 85], [3, 12], [0, 6]], taa: [12, 76, 8, 4],
      desc: '以短久期债券打底，少量权益增强，强调回撤控制与流动性，适合短期闲置资金。',
      funds: [
        { code: '110027', weight: 25, role: '核心' },
        { code: '003567', weight: 25, role: '核心' },
        { code: '001316', weight: 25, role: '核心' },
        { code: '000032', weight: 3, role: '核心' },
        { code: '000311', weight: 10, role: '卫星' },
        { code: '000198', weight: 8, role: '流动性' },
        { code: '000216', weight: 4, role: '卫星' }
      ]
    },
    {
      id: 'S-2026-06', name: '多资产配置 04 号', category: '多资产', risk: 'R3',
      styles: ['多资产'], goal: '多资产', minHorizon: 4, liquidity: '中', minInvestment: 10000,
      rating: 4.1, score: 77, status: '观察', clients: 25, aum: '¥3.4亿', reviewedAt: '2026/10/15',
      metrics: { ret: '+6.4%', vol: '8.2%', drawdown: '-10.4%', sharpe: '0.7', capacity: '8 亿', fee: '0.58%' },
      scores: { ret: 76, vol: 76, drawdown: 72, sharpe: 70, stability: 74, capacity: 68, fee: 72 },
      saa: [35, 40, 15, 10], ranges: [[28, 42], [33, 48], [8, 20], [5, 15]], taa: [36, 39, 15, 10],
      desc: '跨权益、债券、货币与黄金进行多资产配置，通过低相关性资产降低组合波动。',
      funds: [
        { code: '000311', weight: 15, role: '核心' },
        { code: '000961', weight: 15, role: '核心' },
        { code: '005827', weight: 5, role: '卫星' },
        { code: '110027', weight: 15, role: '核心' },
        { code: '003567', weight: 15, role: '核心' },
        { code: '001316', weight: 10, role: '核心' },
        { code: '000198', weight: 15, role: '流动性' },
        { code: '000216', weight: 10, role: '卫星' }
      ]
    }
  ],

  /* ----------------------------- 三级组合 ----------------------------- */
  modelPortfolios: [
    {
      id: 'MP-301', name: '稳健增值 03 号 · 标准组合', strategyId: 'S-2026-01', risk: 'R2',
      ret: '+4.3%', vol: '5.2%', saaDeviation: '2.1%', taaDeviation: '1.5%', clients: 86, status: '正常',
      saa: [20, 65, 10, 5], taa: [22, 62, 11, 5], actual: [21, 64, 10, 5]
    },
    {
      id: 'MP-302', name: '均衡增长 01 号 · 标准组合', strategyId: 'S-2026-02', risk: 'R3',
      ret: '+7.5%', vol: '9.8%', saaDeviation: '4.2%', taaDeviation: '2.8%', clients: 118, status: '正常',
      saa: [40, 45, 10, 5], taa: [43, 42, 10, 5], actual: [44, 41, 10, 5]
    },
    {
      id: 'MP-303', name: '积极成长 02 号 · 标准组合', strategyId: 'S-2026-03', risk: 'R4',
      ret: '+11.2%', vol: '14.5%', saaDeviation: '8.2%', taaDeviation: '4.6%', clients: 64, status: '观察',
      saa: [60, 30, 5, 5], taa: [64, 26, 5, 5], actual: [66, 24, 5, 5]
    },
    {
      id: 'MP-304', name: '红利低波 05 号 · 标准组合', strategyId: 'S-2026-04', risk: 'R2',
      ret: '+6.1%', vol: '6.4%', saaDeviation: '1.8%', taaDeviation: '1.2%', clients: 42, status: '正常',
      saa: [25, 60, 10, 5], taa: [27, 58, 10, 5], actual: [26, 59, 11, 4]
    },
    {
      id: 'MP-305', name: '固收增强 07 号 · 标准组合', strategyId: 'S-2026-05', risk: 'R2',
      ret: '+3.9%', vol: '4.6%', saaDeviation: '1.6%', taaDeviation: '0.9%', clients: 31, status: '正常',
      saa: [10, 78, 8, 4], taa: [12, 76, 8, 4], actual: [11, 77, 8, 4]
    },
    {
      id: 'MP-306', name: '多资产配置 04 号 · 标准组合', strategyId: 'S-2026-06', risk: 'R3',
      ret: '+6.4%', vol: '8.2%', saaDeviation: '3.4%', taaDeviation: '2.0%', clients: 25, status: '观察',
      saa: [35, 40, 15, 10], taa: [36, 39, 15, 10], actual: [36, 39, 14, 11]
    }
  ],

  clientPortfolios: [
    { clientId: 'C1024', name: '陈悦', modelId: 'MP-301', aum: '¥286万', actual: [18, 66, 11, 5], deviation: '1.6%', status: '正常', lastReview: '2026/10/28' },
    { clientId: 'C1158', name: '赵明远', modelId: 'MP-302', aum: '¥518万', actual: [48, 39, 9, 4], deviation: '8.0%', status: '待调仓', lastReview: '2026/09/30' },
    { clientId: 'C1207', name: '李婧', modelId: 'MP-303', aum: '¥132万', actual: [64, 26, 5, 5], deviation: '4.4%', status: '待沟通', lastReview: '2026/10/12' },
    { clientId: 'C1342', name: '周建国', modelId: 'MP-305', aum: '¥845万', actual: [11, 77, 8, 4], deviation: '1.0%', status: '正常', lastReview: '2026/10/20' },
    { clientId: 'C1490', name: '王晓岚', modelId: 'MP-304', aum: '¥362万', actual: [26, 59, 11, 4], deviation: '1.8%', status: '跟进中', lastReview: '2026/10/08' }
  ],

  /* ----------------------------- 投顾调仓建议 ----------------------------- */
  rebalanceAdvices: [
    {
      id: 'RA-2026-1114', clientId: 'C1024', clientName: '陈女士', advisor: '林予安',
      pushedAt: '2026/11/14 09:30', validUntil: '2026/11/18', status: 'PENDING',
      reason: '降低单只债券基金集中度，提升宽基指数与黄金分散度；权益整体维持在 R3 画像匹配区间。',
      basis: '基于 R3 平衡型画像、最新持仓与投顾组合检视结果',
      summary: { sell: 254711, buy: 254711, fee: 220, turnover: '19.8%' },
      fromAssets: [41.7, 33.9, 15.3, 9.1],
      toAssets: [40, 35, 15, 10],
      items: [
        { code: '110027', name: '易方达安心回报债券', type: '债券', action: '调出', fromWeight: 28.6, toWeight: 20, amount: -110632 },
        { code: '000311', name: '景顺长城沪深300增强', type: '权益', action: '调出', fromWeight: 23.2, toWeight: 18, amount: -66894 },
        { code: '005827', name: '易方达蓝筹精选混合', type: '权益', action: '调出', fromWeight: 14.7, toWeight: 10, amount: -60462 },
        { code: '000216', name: '华安黄金ETF联接A', type: '黄金', action: '调出', fromWeight: 6.0, toWeight: 5, amount: -12864 },
        { code: '000198', name: '天弘余额宝货币', type: '货币', action: '调出', fromWeight: 15.3, toWeight: 15, amount: -3859 },
        { code: '003567', name: '招商招财通理财债券', type: '债券', action: '调入', fromWeight: 5.3, toWeight: 15, amount: 124783 },
        { code: '000961', name: '天弘沪深300ETF联接A', type: '权益', action: '调入', fromWeight: 0, toWeight: 7, amount: 90049 },
        { code: '160119', name: '南方中证500ETF联接A', type: '权益', action: '增持', fromWeight: 3.8, toWeight: 5, amount: 15437 },
        { code: '002611', name: '博时黄金ETF联接C', type: '黄金', action: '增持', fromWeight: 3.1, toWeight: 5, amount: 24442 }
      ]
    },
    {
      id: 'RA-2026-1031', clientId: 'C1024', clientName: '陈女士', advisor: '林予安',
      pushedAt: '2026/10/31 09:00', validUntil: '2026/11/05', status: 'EXPIRED',
      reason: '战术调整：适度拉长债券久期，降低货币基金占比。',
      basis: '基于利率环境与流动性安排',
      summary: { sell: 82000, buy: 82000, fee: 96, turnover: '6.4%' },
      fromAssets: [42, 33, 16, 9], toAssets: [42, 36, 13, 9], items: []
    },
    {
      id: 'RA-2026-0928', clientId: 'C1024', clientName: '陈女士', advisor: '林予安',
      pushedAt: '2026/09/28 10:10', confirmedAt: '2026/09/29 14:20', validUntil: '2026/10/02', status: 'CONFIRMED',
      reason: '季度再平衡：降低货币基金占比，补充宽基指数与红利资产。',
      basis: '基于季度组合检视与客户风险画像',
      summary: { sell: 136000, buy: 136000, fee: 168, turnover: '10.6%' },
      fromAssets: [43, 31, 19, 7], toAssets: [42, 34, 15, 9], items: []
    }
  ],

  /* ----------------------------- 客户与 KYC ----------------------------- */
  clients: [
    {
      id: 'C1024', name: '陈悦', avatar: '陈', risk: '稳健型 R2', riskKey: 'R2', aum: '¥286万', ret: '+3.8%',
      status: '待沟通', priority: '高', note: '当前引用策略风险等级高于客户画像',
      goal: '长期稳健增值', goalCategory: '稳健增值', terms: '3–5 年', horizonYears: 4,
      liquidity: '中', experience: '5 年', age: '42 岁', products: '8 只'
    },
    {
      id: 'C1158', name: '赵明远', avatar: '赵', risk: '平衡型 R3', riskKey: 'R3', aum: '¥518万', ret: '+6.2%',
      status: '待调仓', priority: '高', note: '组合偏离 SAA 目标，权益权重触及区间上沿',
      goal: '稳健增值并控制波动', goalCategory: '均衡增长', terms: '5 年以上', horizonYears: 6,
      liquidity: '中', experience: '8 年', age: '47 岁', products: '11 只'
    },
    {
      id: 'C1207', name: '李婧', avatar: '李', risk: '进取型 R4', riskKey: 'R4', aum: '¥132万', ret: '+9.1%',
      status: '跟进中', priority: '中', note: '成长风格集中度偏高，需补充风险提示',
      goal: '长期资本增值', goalCategory: '积极成长', terms: '5 年以上', horizonYears: 6,
      liquidity: '低', experience: '3 年', age: '35 岁', products: '6 只'
    },
    {
      id: 'C1342', name: '周建国', avatar: '周', risk: '稳健型 R2', riskKey: 'R2', aum: '¥845万', ret: '+4.2%',
      status: '正常', priority: '低', note: '近期到期资金需配置，流动性要求较高',
      goal: '稳健收益与流动性', goalCategory: '固收+', terms: '1–3 年', horizonYears: 2,
      liquidity: '高', experience: '10 年', age: '58 岁', products: '9 只'
    },
    {
      id: 'C1490', name: '王晓岚', avatar: '王', risk: '平衡型 R3', riskKey: 'R3', aum: '¥362万', ret: '+5.8%',
      status: '待沟通', priority: '中', note: '历史大类资产比例偏离目标，建议重新评估',
      goal: '子女教育与长期增值', goalCategory: '均衡增长', terms: '3–5 年', horizonYears: 4,
      liquidity: '中', experience: '4 年', age: '39 岁', products: '7 只'
    }
  ],

  /* ----------------------------- 风险事件 ----------------------------- */
  risks: [
    {
      id: 1, title: '陈悦 · 策略风险等级不匹配', type: '高风险', category: 'KYC与策略适配',
      detail: '客户风险画像为 R2，当前引用「均衡增长 01 号」策略（R3），超出客户风险承受能力，需调整策略或补充适当性确认。',
      time: '09:42', rule: 'KYC-01'
    },
    {
      id: 2, title: '赵明远 · SAA 权益权重越界', type: '高风险', category: 'SAA/TAA偏离',
      detail: '客户组合实际权益权重 48%，超出 SAA 区间带 40%–45%，建议生成再平衡草案。',
      time: '09:16', rule: 'SAA-02'
    },
    {
      id: 3, title: '积极成长 02 号 · TAA 偏离超限', type: '中风险', category: 'SAA/TAA偏离',
      detail: 'TAA 权益权重 64%，相对 SAA 基准 60% 偏离 +4pp，超过 ±3pp 内部阈值，需评估战术仓位。',
      time: '昨日 17:30', rule: 'TAA-03'
    },
    {
      id: 4, title: '科技主题组合 · 单只基金集中度预警', type: '高风险', category: '集中度与流动性',
      detail: '单只基金「中欧时代先锋股票A」权重 28.6%，超过单基金 25% 上限，建议降低集中度。',
      time: '09:16', rule: 'CON-01'
    },
    {
      id: 5, title: '稳健增值 03 号 · 最大回撤观察', type: '中风险', category: '回撤与策略健康',
      detail: '滚动最大回撤 -6.8%，接近预设观察线 -7.0%，建议评估而非自动交易。',
      time: '昨日 15:10', rule: 'DD-02'
    },
    {
      id: 6, title: '红利低波 05 号 · 策略评级下调', type: '中风险', category: '回撤与策略健康',
      detail: '策略综合评分由 4.6 下调至 4.3，稳定性维度低于观察阈值，建议复核存量客户适配性。',
      time: '昨日 11:20', rule: 'STR-04'
    }
  ],

  /* ----------------------------- 审批事项 ----------------------------- */
  approvals: [
    { id: 'P-2026-1120', type: 'SAA 年度审议', target: '稳健增值 03 号', level: 'SAA', rule: '适当性检查通过', ruleWarn: false, approved: false },
    { id: 'P-2026-1121', type: 'TAA 季度调整', target: '均衡增长 01 号', level: 'TAA', rule: '区间带检查通过', ruleWarn: false, approved: false },
    { id: 'P-2026-1122', type: '基金调仓', target: '积极成长 02 号', level: '基金', rule: '集中度提示待补充', ruleWarn: true, approved: false },
    { id: 'P-2026-1123', type: '客户报告', target: '李婧', level: '客户', rule: '风险提示待补充', ruleWarn: true, approved: false },
    { id: 'P-2026-1124', type: '配置建议', target: '周建国', level: '客户', rule: '适当性检查通过', ruleWarn: false, approved: true }
  ],

  /* ----------------------------- 通知 ----------------------------- */
  notifications: {
    investor: [
      { id: 'un-0', type: 'approval', title: '投顾调仓建议待确认', desc: '林予安已推送调仓建议，有效期至 11 月 18 日，请核对调出/调入明细。', time: '今天 09:30', href: 'plan.html' },
      { id: 'un-1', type: 'report', title: '本周组合体检已完成', desc: 'AI 已生成组合健康检查摘要，可前往持仓页查看。', time: '今天 09:20', href: 'holdings.html' },
      { id: 'un-2', type: 'cashflow', title: '定投计划将于 11 月 8 日执行', desc: '每月 ¥5,000 · 2 只基金，可在交易记录页调整计划。', time: '昨天 18:05', href: 'transactions.html' },
      { id: 'un-3', type: 'risk', title: 'AI 洞察：单只基金占比进入关注区间', desc: '易方达安心回报债券占比 28.6%，建议关注组合分散度。', time: '昨天 15:30', href: 'holdings.html' }
    ],
    advisor: [
      { id: 'an-1', type: 'risk', title: '陈悦 · 策略风险等级不匹配', desc: '客户 R2 引用了 R3 策略，需按 KYC 重新匹配。', time: '09:42', href: 'risks.html' },
      { id: 'an-2', type: 'approval', title: 'P-2026-1120 SAA 年度审议待复核', desc: '稳健增值 03 号 SAA 基准与区间带已完成规则校验。', time: '09:12', href: 'compliance.html' },
      { id: 'an-3', type: 'risk', title: '赵明远 · SAA 权益权重越界', desc: '实际权益 48%，超出区间带 40%–45%。', time: '09:16', href: 'risks.html' },
      { id: 'an-4', type: 'report', title: '客户报告 AI 草案待复核', desc: '李婧 · 客户报告草案缺少风险提示节，需补充。', time: '08:50', href: 'reports.html' }
    ]
  },

  /* ----------------------------- 交易与持仓 ----------------------------- */
  holdings: [
    { code: '110027', name: '易方达安心回报债券', value: '¥368,200', pnl: '+¥14,230', ret: '+4.02%', type: '债券', share: '28.6%' },
    { code: '000311', name: '景顺长城沪深300增强', value: '¥298,450', pnl: '+¥28,170', ret: '+10.42%', type: '权益', share: '23.2%' },
    { code: '005827', name: '易方达蓝筹精选混合', value: '¥189,400', pnl: '+¥18,650', ret: '+8.24%', type: '权益', share: '14.7%' },
    { code: '000198', name: '天弘余额宝货币', value: '¥196,900', pnl: '+¥2,210', ret: '+1.14%', type: '货币', share: '15.3%' },
    { code: '000216', name: '华安黄金ETF联接A', value: '¥77,150', pnl: '+¥8,620', ret: '+12.58%', type: '黄金', share: '6.0%' },
    { code: '003567', name: '招商招财通理财债券', value: '¥68,300', pnl: '+¥1,240', ret: '+1.86%', type: '债券', share: '5.3%' },
    { code: '160119', name: '南方中证500ETF联接A', value: '¥48,600', pnl: '-¥1,120', ret: '-2.35%', type: '权益', share: '3.8%' },
    { code: '002611', name: '博时黄金ETF联接C', value: '¥39,420', pnl: '+¥2,010', ret: '+5.68%', type: '黄金', share: '3.1%' }
  ],

  transactions: [
    { type: '基金申购', fund: '易方达安心回报债券', time: '11月12日 15:10', amount: '-¥15,000', status: '确认成功', receipt: { no: 'TA20261113001', date: '2026/11/13', nav: '1.9738', shares: '7,599.35', fee: '¥12.00' } },
    { type: '基金定投', fund: '景顺长城沪深300增强', time: '11月08日 09:30', amount: '-¥5,000', status: '确认成功', receipt: { no: 'TA20261109002', date: '2026/11/09', nav: '2.1740', shares: '2,299.82', fee: '¥7.50' } },
    { type: '基金赎回', fund: '天弘余额宝货币', time: '11月05日 14:22', amount: '+¥20,000', status: '确认成功', receipt: { no: 'TA20261106003', date: '2026/11/06', nav: '1.0000', shares: '20,000.00', fee: '¥0.00' } },
    { type: '基金分红', fund: '易方达蓝筹精选混合', time: '11月01日 10:05', amount: '+¥1,280', status: '确认成功', receipt: { no: 'TA20261102004', date: '2026/11/02', nav: '1.9741', shares: '648.40', fee: '¥0.00' } },
    { type: '基金申购', fund: '华安黄金ETF联接A', time: '10月28日 11:40', amount: '-¥8,000', status: '确认成功', receipt: { no: 'TA20261029005', date: '2026/10/29', nav: '1.8330', shares: '4,315.44', fee: '¥48.00' } }
  ],

  /* ----------------------------- 投顾端客户交易/TA 状态（只读演示） ----------------------------- */
  clientTradeStatus: {
    C1024: [
      { date: '2026/11/16', type: '基金申购', fund: '易方达安心回报债券', amount: '¥15,000', status: '待登记确认', receipt: '—' },
      { date: '2026/11/14', type: '基金赎回', fund: '天弘余额宝货币', amount: '1,000 份', status: '确认成功', receipt: 'TA20261115008' },
      { date: '2026/11/12', type: '基金申购', fund: '易方达蓝筹精选混合', amount: '¥8,000', status: '确认失败', receipt: 'TA20261113012 · 基金限购' }
    ],
    C1158: [
      { date: '2026/11/15', type: '基金调仓', fund: '组合调仓 · 7 只基金', amount: '调出 ¥86,000', status: '确认成功', receipt: 'TA20261116021' }
    ]
  }
};
