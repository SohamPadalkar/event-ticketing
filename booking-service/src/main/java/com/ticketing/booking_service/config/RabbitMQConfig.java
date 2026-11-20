package com.ticketing.booking_service.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "ticketing.exchange";
    public static final String NOTIFICATION_QUEUE = "notification.queue";
    public static final String ROUTING_KEY = "booking.confirmed";

    @Bean
    public TopicExchange ticketingExchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public Queue notificationQueue() {
        // durable = true ensures messages survive even if RabbitMQ restarts!
        return QueueBuilder.durable(NOTIFICATION_QUEUE).build();
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, TopicExchange ticketingExchange) {
        return BindingBuilder.bind(notificationQueue)
                .to(ticketingExchange)
                .with(ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}