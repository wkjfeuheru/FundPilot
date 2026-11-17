package com.jason.platform.service;
import com.jason.platform.mapper.TerminalEventMapper;
import com.jason.platform.mapper.TerminalEventMapper.Event;
import com.jason.advice.service.AdviceTerminalSubscriber;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class TerminalEventDispatcher {
    private final TerminalEventMapper mapper;
    private final AdviceTerminalSubscriber advice;
    private final String owner=UUID.randomUUID().toString();
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void dispatch(){
        mapper.initializeLease();
        if(mapper.acquire(owner)!=1)return;
        var events=mapper.due();
        var valid=events.stream().filter(advice::accepts).toList();
        var invalid=events.stream().filter(e->!advice.accepts(e)).map(Event::id).toList();
        advice.consume(valid);
        if(!valid.isEmpty())mapper.delivered(valid.stream().map(Event::id).toList());
        if(!invalid.isEmpty())mapper.retry(invalid);
        mapper.release(owner);
    }
}
