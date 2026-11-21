package com.ticketing.gateway.controller;

import com.ticketing.gateway.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final JwtService jwtService;

    private static final Map<String, UserRecord> USERS = Map.of(
            "organizer@frcrce.edu.in", new UserRecord("admin123", "ORGANIZER"),
            "soham@frcrce.edu.in", new UserRecord("pass123", "USER")
    );

    public AuthController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        UserRecord user = USERS.get(request.email());
        if (user == null || !user.password().equals(request.password())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password"));
        }

        String token = jwtService.generateToken(request.email(), user.role());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "email", request.email(),
                "role", user.role()
        ));
    }

    public record LoginRequest(String email, String password) {}
    private record UserRecord(String password, String role) {}
}