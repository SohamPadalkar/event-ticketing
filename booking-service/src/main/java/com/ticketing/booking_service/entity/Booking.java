package com.ticketing.booking_service.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID eventId;

    @Column(nullable = false)
    private String customerEmail;

    @Column(nullable = false)
    private Integer seatsBooked;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private String status; // e.g., CONFIRMED, FAILED

    @Column(nullable = false)
    private LocalDateTime bookedAt;

    public Booking() {
    }

    public Booking(UUID eventId, String customerEmail, Integer seatsBooked, BigDecimal totalAmount, String status) {
        this.eventId = eventId;
        this.customerEmail = customerEmail;
        this.seatsBooked = seatsBooked;
        this.totalAmount = totalAmount;
        this.status = status;
        this.bookedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getEventId() { return eventId; }
    public String getCustomerEmail() { return customerEmail; }
    public Integer getSeatsBooked() { return seatsBooked; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public String getStatus() { return status; }
    public LocalDateTime getBookedAt() { return bookedAt; }
}