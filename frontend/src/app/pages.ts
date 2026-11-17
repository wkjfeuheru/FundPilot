import type { ComponentType } from 'react'
import type { IconName } from '../components/Icon'
import investorOverview from '../modes/investor/OverviewPage'
import investorFunds from '../modes/investor/FundsPage'
import investorPlan from '../modes/investor/PlanPage'
import investorHoldings from '../modes/investor/HoldingsPage'
import investorTransactions from '../modes/investor/TransactionsPage'
import investorAi from '../modes/investor/AiPage'
import investorProfile from '../modes/investor/ProfilePage'
import advisorOverview from '../modes/advisor/OverviewPage'
import advisorClients from '../modes/advisor/ClientsPage'
import advisorStrategy from '../modes/advisor/StrategyPage'
import advisorPortfolios from '../modes/advisor/PortfoliosPage'
import advisorRisks from '../modes/advisor/RisksPage'
import advisorReports from '../modes/advisor/ReportsPage'
import advisorAi from '../modes/advisor/AiPage'
import advisorCompliance from '../modes/advisor/CompliancePage'

export type ShellMode = 'investor' | 'advisor'
interface PageDefinition { path: string; label: string; icon: IconName; component: ComponentType }

export const pages: Record<ShellMode, PageDefinition[]> = {
  investor: [
    { path: 'overview', label: '资产总览', icon: 'dashboard', component: investorOverview },
    { path: 'funds', label: '基金超市', icon: 'search', component: investorFunds },
    { path: 'plan', label: '投顾调仓建议', icon: 'refresh', component: investorPlan },
    { path: 'holdings', label: '我的持仓', icon: 'wallet', component: investorHoldings },
    { path: 'transactions', label: '交易记录', icon: 'exchange', component: investorTransactions },
    { path: 'ai', label: 'AI 理财助手', icon: 'sparkles', component: investorAi },
    { path: 'profile', label: '风险画像与账户', icon: 'shield', component: investorProfile },
  ],
  advisor: [
    { path: 'overview', label: '工作台总览', icon: 'dashboard', component: advisorOverview },
    { path: 'clients', label: '客户 360', icon: 'users', component: advisorClients },
    { path: 'strategy', label: '策略库', icon: 'layers', component: advisorStrategy },
    { path: 'portfolios', label: '组合管理', icon: 'briefcase', component: advisorPortfolios },
    { path: 'risks', label: '风险监控', icon: 'alert', component: advisorRisks },
    { path: 'reports', label: '投顾报告', icon: 'file', component: advisorReports },
    { path: 'ai', label: 'AI 研究助手', icon: 'sparkles', component: advisorAi },
    { path: 'compliance', label: '审批与合规', icon: 'clipboard', component: advisorCompliance },
  ],
}
