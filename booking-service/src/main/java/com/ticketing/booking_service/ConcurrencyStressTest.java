package com.ticketing.booking_service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class ConcurrencyStressTest {

    public static void main(String[] args) throws Exception {
        String eventId = "cc931fdb-9d20-4372-b722-0f0d191899c4";
        int totalUsers = 20;

        HttpClient client = HttpClient.newHttpClient();
        CountDownLatch startGate = new CountDownLatch(1);
        AtomicInteger confirmedCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<?>> futures = new ArrayList<>();

            for (int i = 1; i <= totalUsers; i++) {
                final int userNum = i;
                futures.add(executor.submit(() -> {
                    try {
                        // Hold all 20 threads at the starting line so they fire simultaneously
                        startGate.await();

                        String json = """
                                {
                                  "eventId": "%s",
                                  "customerEmail": "user%d@test.com",
                                  "seats": 1
                                }
                                """.formatted(eventId, userNum);

                        HttpRequest request = HttpRequest.newBuilder()
                                .uri(URI.create("http://localhost:8082/api/v1/bookings"))
                                .header("Content-Type", "application/json")
                                .POST(HttpRequest.BodyPublishers.ofString(json))
                                .build();

                        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

                        if (response.statusCode() == 201) {
                            confirmedCount.incrementAndGet();
                            System.out.println("User " + userNum + " -> 201 CONFIRMED");
                        } else {
                            conflictCount.incrementAndGet();
                            System.out.println("User " + userNum + " -> " + response.statusCode() + " REJECTED");
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }));
            }

            // Release all 20 threads at the exact same nanosecond!
            System.out.println("Firing 20 concurrent booking requests for 3 available seats...");
            startGate.countDown();

            for (Future<?> f : futures) {
                f.get();
            }
        }

        System.out.println("\n=== STRESS TEST RESULTS ===");
        System.out.println("Confirmed Bookings (Expected 3):  " + confirmedCount.get());
        System.out.println("Rejected Conflicts (Expected 17): " + conflictCount.get());
    }
}