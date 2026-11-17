package com.jason.platform.service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor @Slf4j
public class TerminalEventScheduler {
    private final TerminalEventDispatcher dispatcher;
    @Scheduled(fixedDelayString="${app.ta.dispatch-delay-ms:5000}",initialDelayString="${app.ta.dispatch-delay-ms:5000}")
    public void dispatch(){
        try{dispatcher.dispatch();}
        catch(DataAccessException e){log.warn("Trade terminal dispatch rolled back; durable events will be retried: {}",e.getClass().getSimpleName());}
    }
}
