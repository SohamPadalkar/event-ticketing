package com.ticketing.notification.controller;

import com.ticketing.notification.service.NotificationConsumerService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tickets")
public class TicketQrController {

    private final NotificationConsumerService consumerService;

    public TicketQrController(NotificationConsumerService consumerService) {
        this.consumerService = consumerService;
    }

    @GetMapping(value = "/{bookingId}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getTicketQr(@PathVariable UUID bookingId) {
        byte[] png = consumerService.getTicketQrPng(bookingId);
        if (png == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(png);
    }
}