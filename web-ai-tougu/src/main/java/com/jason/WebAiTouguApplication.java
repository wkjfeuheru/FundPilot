package com.jason;

import org.apache.ibatis.annotations.Mapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableScheduling
@MapperScan(basePackages = "com.jason", annotationClass = Mapper.class)
public class WebAiTouguApplication {

    public static void main(String[] args) {
        SpringApplication.run(WebAiTouguApplication.class, args);
    }

}
