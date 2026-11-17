package com.jason.advice.service;
import com.jason.advice.mapper.AdviceTerminalMapper;
import com.jason.platform.mapper.TerminalEventMapper.Event;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Objects;

/** Consumes committed trade facts; the outbox transaction owns acknowledgement and advice updates. */
@Component @RequiredArgsConstructor
public class AdviceTerminalSubscriber {
    private final AdviceTerminalMapper mapper;
    public boolean accepts(Event e) {
        int status="trade.confirmed".equals(e.eventType())?2:3;
        if(!Objects.equals(e.orderStatus(),status))return false;
        if(e.adviceId()==null || e.adviceId()==0)return true;
        int target=status==2?3:6;
        return Objects.equals(e.customerId(),e.adviceCustomerId()) &&
            (Objects.equals(e.adviceStatus(),2) || Objects.equals(e.adviceStatus(),target));
    }
    public void consume(List<Event> events){
        var orders=events.stream().filter(e->e.adviceId()!=null && e.adviceId()>0).map(Event::aggregateId).toList();
        if(!orders.isEmpty())mapper.complete(orders);
    }
}
