package com.jason.asset.service;
import com.jason.asset.dto.AssetOverview;
import com.jason.asset.dto.AssetOverview.Holding;
import com.jason.exception.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import java.io.*;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component public class AssetPdfRenderer {
    public byte[] render(AssetOverview a,List<Holding> holdings){
        try(var doc=new PDDocument();var input=new ClassPathResource("fonts/NotoSansSC-Regular.ttf").getInputStream();var output=new ByteArrayOutputStream()){
            var font=PDType0Font.load(doc,input);doc.getDocumentInformation().setTitle("FundPilot 资产报告");
            try(var page=new Writer(doc,font)){
                page.line("FundPilot / 资产报告",22);page.line("个人资产快照",13);
                page.line("生成时间："+DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.of("Asia/Shanghai")).format(a.updatedAt())+"（北京时间）",10);
                page.line("净值截至："+(a.asOfDate()==null?"暂无持仓净值":a.asOfDate()),10);page.gap();
                page.line("总资产  ¥ "+a.totalAsset(),18);
                page.line("持仓市值："+a.holdingMarketValue()+" 元   现金余额："+a.cashBalance()+" 元",11);
                page.line("可用现金："+a.availableCash()+" 元（总资产包含冻结资金）",11);
                page.line("当前持仓累计收益："+a.cumulativePnl()+" 元 / "+a.cumulativePnlRate()+"%",11);
                page.line("近30日快照资产变化："+a.last30dPnl()+" 元（不足两条快照时为0）",11);
                page.line("风险展示："+a.portfolioRiskLevelLabel()+"（沿用客户画像，不代表组合风险计算）",11);page.gap();
                page.line("持仓配置",15);for(var item:a.allocation())page.line(item.assetClassLabel()+"："+item.weight()+"% / "+item.marketValue()+" 元",11);
                page.gap();page.line("全部持仓明细",15);
                if(holdings.isEmpty())page.line("暂无基金持仓。当前资产为现金。",11);
                for(var h:holdings){page.ensure(130);page.line(h.fundCode()+"  "+h.fundName(),12);
                    page.line("份额 "+h.shares()+"  净值 "+h.latestNav()+"（"+h.navDate()+"）",10);
                    page.line("市值 "+h.marketValue()+" 元  成本 "+h.costAmount()+" 元  浮盈亏 "+h.pnl()+" 元",10);page.gap();}
                page.ensure(150);page.line("规则洞察",15);for(var i:a.insights()){page.ensure(100);page.line(i.title()+" / "+i.tag(),12);page.line(i.description(),10);page.gap();}
                page.newPage();page.line("免责声明与数据口径",22);page.gap();
                page.line("本系统仅用于演示，不构成投资建议。投资有风险，选择需谨慎。",12);
                page.line("本报告为生成时点的账户快照，并非交易确认、资产证明或收益承诺。实际成交、份额、费用及资金结算以 TA 登记回执为准。",11);
                page.line("持仓市值按各基金最近披露净值计算，不同基金净值日可能不同。累计收益仅反映当前持仓市值与成本之差，不包含已清仓历史收益。",11);
                page.line("总资产包含现金余额及在途冻结资金。近30日资产变化来自已有日快照，未剔除申赎、现金流等影响；快照不足时不代表实际收益为零。",11);
                page.line("资产配置比例仅以基金持仓市值为分母。组合风险等级沿用客户画像，规则洞察为确定性提示，不代表全面风险评估或 AI 诊断。行业穿透数据暂不可用。",11);
                page.line("趋势页面的比较基准为演示配置，不是真实指数行情，不应据此作出投资决策。本报告不补造历史数据。",11);
                page.line("定投计划仅在演示系统中保存；保存计划不会立即扣款或确认交易。",11);
            }
            doc.save(output);return output.toByteArray();
        }catch(IOException ex){throw new BusinessException(ErrorCode.INTERNAL_ERROR,"资产报告生成失败，请稍后重试");}
    }
    private static final class Writer implements AutoCloseable {
        private final PDDocument doc;private final PDType0Font font;private PDPageContentStream stream;private float y;
        Writer(PDDocument doc,PDType0Font font)throws IOException{this.doc=doc;this.font=font;newPage();}
        void newPage()throws IOException{if(stream!=null)stream.close();var p=new PDPage(PDRectangle.A4);doc.addPage(p);stream=new PDPageContentStream(doc,p);y=784;
            stream.beginText();stream.setFont(font,9);stream.newLineAtOffset(48,30);stream.showText("FundPilot · 仅供演示    /    "+doc.getNumberOfPages());stream.endText();}
        void gap(){y-=12;}
        void ensure(float height)throws IOException{if(y-height<60)newPage();}
        void line(String text,float size)throws IOException{
            StringBuilder line=new StringBuilder();float width=0;
            for(int cp:text.codePoints().toArray()){
                String glyph=new String(Character.toChars(cp));
                // Unavailable control/supplementary glyphs must not make an entire report fail.
                try{font.encode(glyph);}catch(IllegalArgumentException ex){glyph="?";}
                float next=font.getStringWidth(glyph)/1000*size;
                if(width+next>499&&!line.isEmpty()){
                    String carry="";
                    if("。，；、！？）%".contains(glyph)){int last=line.offsetByCodePoints(line.length(),-1);carry=line.substring(last);line.setLength(last);}
                    draw(line.toString(),size);line.setLength(0);line.append(carry);width=font.getStringWidth(carry)/1000*size;
                }
                line.append(glyph);width+=next;
            }
            if(!line.isEmpty())draw(line.toString(),size);
            y-=5;
        }
        private void draw(String text,float size)throws IOException{if(y-size<60)newPage();stream.beginText();stream.setFont(font,size);stream.newLineAtOffset(48,y);stream.showText(text);stream.endText();y-=size*1.6f;}
        @Override public void close()throws IOException{if(stream!=null)stream.close();}
    }
}
