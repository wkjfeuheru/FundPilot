-- V001：演示风险问卷。仅用于 FundPilot 演示验收，不是机构审核的正式适当性问卷。
-- 人工连接目标数据库后执行；可重复执行，不覆盖已有版本和题目，不修改用户/基金。
-- 8题，每题 0/5/10/15/20，最高160分，默认上界32/64/96/128/160；边界归较低等级。
SET NAMES utf8mb4;
START TRANSACTION;
INSERT INTO risk_questionnaire(version,title,question_count,status)
SELECT 'demo-risk-v1','风险承受能力测评（演示问卷）',8,1
WHERE NOT EXISTS (SELECT 1 FROM risk_questionnaire WHERE version='demo-risk-v1');
SET @risk_demo_id=(SELECT id FROM risk_questionnaire WHERE version='demo-risk-v1');
INSERT INTO risk_question(questionnaire_id,sort_no,title,options) SELECT @risk_demo_id,1,'你的主要投资目标是什么？','[{"text": "尽量避免本金损失", "score": 0}, {"text": "获取较稳定的收入", "score": 5}, {"text": "兼顾稳健与增长", "score": 10}, {"text": "追求长期资本增长", "score": 15}, {"text": "追求较高的长期收益", "score": 20}]' WHERE NOT EXISTS (SELECT 1 FROM risk_question WHERE questionnaire_id=@risk_demo_id AND sort_no=1);
INSERT INTO risk_question(questionnaire_id,sort_no,title,options) SELECT @risk_demo_id,2,'如果投资短期下跌，你能接受的波动程度是？','[{"text": "不愿承担本金波动", "score": 0}, {"text": "可以接受很小的波动", "score": 5}, {"text": "可以接受适度波动", "score": 10}, {"text": "可以接受较大波动", "score": 15}, {"text": "可以接受大幅波动", "score": 20}]' WHERE NOT EXISTS (SELECT 1 FROM risk_question WHERE questionnaire_id=@risk_demo_id AND sort_no=2);
INSERT INTO risk_question(questionnaire_id,sort_no,title,options) SELECT @risk_demo_id,3,'你对基金等投资产品的了解程度是？','[{"text": "尚不了解", "score": 0}, {"text": "了解基础概念", "score": 5}, {"text": "了解常见产品和风险", "score": 10}, {"text": "熟悉多类产品", "score": 15}, {"text": "有较丰富的投资知识", "score": 20}]' WHERE NOT EXISTS (SELECT 1 FROM risk_question WHERE questionnaire_id=@risk_demo_id AND sort_no=3);
INSERT INTO risk_question(questionnaire_id,sort_no,title,options) SELECT @risk_demo_id,4,'这笔投资预计多久后需要使用？','[{"text": "一年以内", "score": 0}, {"text": "一至两年", "score": 5}, {"text": "两至三年", "score": 10}, {"text": "三至五年", "score": 15}, {"text": "五年以上", "score": 20}]' WHERE NOT EXISTS (SELECT 1 FROM risk_question WHERE questionnaire_id=@risk_demo_id AND sort_no=4);
INSERT INTO risk_question(questionnaire_id,sort_no,title,options) SELECT @risk_demo_id,5,'用于本次投资的资金占可投资资产的比例是？','[{"text": "超过80%", "score": 0}, {"text": "60%至80%", "score": 5}, {"text": "40%至60%", "score": 10}, {"text": "20%至40%", "score": 15}, {"text": "不超过20%", "score": 20}]' WHERE NOT EXISTS (SELECT 1 FROM risk_question WHERE questionnaire_id=@risk_demo_id AND sort_no=5);
INSERT INTO risk_question(questionnaire_id,sort_no,title,options) SELECT @risk_demo_id,6,'你为日常开支保留的应急资金可支持多久？','[{"text": "不足一个月", "score": 0}, {"text": "一至三个月", "score": 5}, {"text": "三至六个月", "score": 10}, {"text": "六至十二个月", "score": 15}, {"text": "超过十二个月", "score": 20}]' WHERE NOT EXISTS (SELECT 1 FROM risk_question WHERE questionnaire_id=@risk_demo_id AND sort_no=6);
INSERT INTO risk_question(questionnaire_id,sort_no,title,options) SELECT @risk_demo_id,7,'面对同等期限的投资，你更倾向于哪类组合？','[{"text": "极低波动，收益也较低", "score": 0}, {"text": "较低波动，追求稳健收益", "score": 5}, {"text": "中等波动，兼顾收益", "score": 10}, {"text": "较高波动，追求较高收益", "score": 15}, {"text": "高波动，追求更高收益", "score": 20}]' WHERE NOT EXISTS (SELECT 1 FROM risk_question WHERE questionnaire_id=@risk_demo_id AND sort_no=7);
INSERT INTO risk_question(questionnaire_id,sort_no,title,options) SELECT @risk_demo_id,8,'当投资出现亏损时，你通常如何应对？','[{"text": "立即退出，不能接受亏损", "score": 0}, {"text": "减少投入，尽量降低波动", "score": 5}, {"text": "重新评估后谨慎持有", "score": 10}, {"text": "根据长期目标继续持有", "score": 15}, {"text": "有能力承受亏损并持续评估", "score": 20}]' WHERE NOT EXISTS (SELECT 1 FROM risk_question WHERE questionnaire_id=@risk_demo_id AND sort_no=8);
COMMIT;
