package com.ticketing.booking_service.service;

import com.ticketing.booking_service.config.RabbitMQConfig;
import com.ticketing.booking_service.dto.BookingResponse;
import com.ticketing.booking_service.dto.CatalogEventDto;
import com.ticketing.booking_service.dto.CreateBookingRequest;
import com.ticketing.booking_service.entity.Booking;
import com.ticketing.booking_service.event.BookingConfirmedEvent;
import com.ticketing.booking_service.repository.BookingRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RestClient catalogRestClient;
    private final RabbitTemplate rabbitTemplate;

    public BookingService(BookingRepository bookingRepository,
                          RestClient catalogRestClient,
                          RabbitTemplate rabbitTemplate) {
        this.bookingRepository = bookingRepository;
        this.catalogRestClient = catalogRestClient;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request) {
        try {
            // 1. Call event-catalog-service (8081) synchronously to reserve seats
            CatalogEventDto reservedEvent = catalogRestClient.post()
                    .uri("/api/v1/events/{id}/reserve", request.eventId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("seats", request.seats()))
                    .retrieve()
                    .body(CatalogEventDto.class);

            if (reservedEvent == null) {
                throw new IllegalStateException("Empty response from Event Catalog Service");
            }

            // 2. Calculate total price using exact BigDecimal multiplication
            BigDecimal totalAmount = reservedEvent.ticketPrice()
                    .multiply(BigDecimal.valueOf(request.seats()));

            // 3. Persist the confirmed booking inside booking_schema
            Booking booking = new Booking(
                    request.eventId(),
                    request.customerEmail(),
                    request.seats(),
                    totalAmount,
                    "CONFIRMED"
            );

            Booking saved = bookingRepository.save(booking);

            // 4. Publish asynchronous event to RabbitMQ!
            BookingConfirmedEvent event = new BookingConfirmedEvent(
                    saved.getId(),
                    saved.getEventId(),
                    saved.getCustomerEmail(),
                    saved.getSeatsBooked(),
                    saved.getTotalAmount(),
                    saved.getBookedAt()
            );
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME,
                    RabbitMQConfig.ROUTING_KEY,
                    event
            );

            return mapToResponse(saved);

        } catch (HttpClientErrorException.Conflict ex) {
            throw new IllegalStateException("Booking failed: Seats unavailable or concurrent modification occurred.");
        } catch (HttpClientErrorException.NotFound ex) {
            throw new IllegalArgumentException("Event not found with id: " + request.eventId());
        }
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAll().stream().map(this::mapToResponse).toList();
    }

    private BookingResponse mapToResponse(Booking b) {
        return new BookingResponse(
                b.getId(),
                b.getEventId(),
                b.getCustomerEmail(),
                b.getSeatsBooked(),
                b.getTotalAmount(),
                b.getStatus(),
                b.getBookedAt()
        );
    }
}