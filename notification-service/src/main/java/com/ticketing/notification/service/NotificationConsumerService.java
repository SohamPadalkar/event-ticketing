package com.ticketing.notification.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.ticketing.notification.config.RabbitMQConfig;
import com.ticketing.notification.event.BookingConfirmedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NotificationConsumerService {

    private static final Logger log = LoggerFactory.getLogger(NotificationConsumerService.class);
    private final Map<UUID, byte[]> ticketQrStore = new ConcurrentHashMap<>();

    @RabbitListener(queues = RabbitMQConfig.NOTIFICATION_QUEUE)
    public void handleBookingConfirmed(BookingConfirmedEvent event) {
        log.info("=================================================");
        log.info("RECEIVED EVENT FROM RABBITMQ: Booking ID = {}", event.bookingId());

        String qrPayload = "TICKET|BOOKING:" + event.bookingId()
                + "|EVENT:" + event.eventId()
                + "|SEATS:" + event.seatsBooked();

        byte[] pngBytes = generateQrPngBytes(qrPayload);
        ticketQrStore.put(event.bookingId(), pngBytes);

        // Also save a local PNG file in notification-service/tickets/ so you can double-click it!
        try {
            Path dir = Path.of("tickets");
            Files.createDirectories(dir);
            Path filePath = dir.resolve("ticket-" + event.bookingId() + ".png");
            Files.write(filePath, pngBytes);
            log.info("Saved scannable QR image to: {}", filePath.toAbsolutePath());
        } catch (Exception e) {
            log.warn("Could not write PNG file to disk", e);
        }
        log.info("=================================================");
    }

    public byte[] getTicketQrPng(UUID bookingId) {
        return ticketQrStore.get(bookingId);
    }

    private byte[] generateQrPngBytes(String text) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix bitMatrix = writer.encode(text, BarcodeFormat.QR_CODE, 250, 250);
            ByteArrayOutputStream pngOutput = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutput);
            return pngOutput.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate QR code", e);
        }
    }
}