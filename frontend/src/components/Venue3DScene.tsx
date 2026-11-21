"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, RoundedBox, Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";

export type VenueType = "CINEMA" | "AUDITORIUM" | "STADIUM";

export interface Seat3D {
    id: string;
    label: string;
    section: string;
    position: [number, number, number];
    priceMultiplier: number;
    occupied: boolean;
}

interface Venue3DSceneProps {
    venueType: VenueType;
    eventTitle: string;
    availableSeats: number;
    totalSeats: number;
    selectedSeats: string[];
    focusedSeat: Seat3D | null;
    povMode: boolean;
    onToggleSeat: (seat: Seat3D) => void;
}

/** Generate procedural 3D coordinates for Cinema, Auditorium, or Stadium */
export function generateVenueSeats(
    venueType: VenueType,
    totalSeats: number,
    availableSeats: number
): Seat3D[] {
    const seats: Seat3D[] = [];
    const occupiedCount = Math.max(0, totalSeats - availableSeats);

    if (venueType === "CINEMA") {
        const rows = ["A", "B", "C", "D", "E", "F", "G"];
        const cols = 12;
        let index = 0;

        for (let r = 0; r < rows.length; r++) {
            const z = -2 + r * 1.45;
            const y = 0.4 + r * 0.55; // Raked stadium incline
            for (let c = 0; c < cols; c++) {
                // Leave a center aisle gap
                const aisleOffset = c >= 6 ? 0.7 : -0.7;
                const x = (c - (cols - 1) / 2) * 1.05 + aisleOffset;
                const isVIP = r >= 3 && r <= 5 && c >= 3 && c <= 8;

                seats.push({
                    id: `${rows[r]}${c + 1}`,
                    label: `${rows[r]}${c + 1}`,
                    section: isVIP ? "Prime Recliner" : "Standard Tier",
                    position: [x, y, z],
                    priceMultiplier: isVIP ? 1.35 : 1.0,
                    occupied: index < occupiedCount && (index * 7) % 3 === 0,
                });
                index++;
            }
        }
    } else if (venueType === "AUDITORIUM") {
        const rows = ["A", "B", "C", "D", "E", "F"];
        let index = 0;

        for (let r = 0; r < rows.length; r++) {
            const radius = 6.5 + r * 1.65;
            const y = 0.35 + r * 0.48;
            const seatsInArc = 14 + r * 2;
            for (let s = 0; s < seatsInArc; s++) {
                const angle = -Math.PI * 0.36 + (s / (seatsInArc - 1)) * (Math.PI * 0.72);
                const x = Math.sin(angle) * radius;
                const z = Math.cos(angle) * radius - 3.5;

                seats.push({
                    id: `${rows[r]}${s + 1}`,
                    label: `${rows[r]}${s + 1}`,
                    section: r <= 1 ? "Front Orchestra" : "Amphitheater",
                    position: [x, y, z],
                    priceMultiplier: r <= 1 ? 1.25 : 1.0,
                    occupied: index < occupiedCount && (index * 5) % 4 === 0,
                });
                index++;
            }
        }
    } else {
        // STADIUM 360 Bowl
        const stands = [
            { name: "North Stand", baseAngle: 0 },
            { name: "East Pavilion", baseAngle: Math.PI / 2 },
            { name: "South Stand", baseAngle: Math.PI },
            { name: "West Pavilion", baseAngle: -Math.PI / 2 },
        ];
        let index = 0;

        for (const stand of stands) {
            for (let tier = 0; tier < 4; tier++) {
                const radius = 10.5 + tier * 1.45;
                const y = 1.2 + tier * 0.95;
                const count = 9;
                for (let i = 0; i < count; i++) {
                    const offset = ((i - (count - 1) / 2) / count) * (Math.PI * 0.38);
                    const angle = stand.baseAngle + offset;
                    const x = Math.sin(angle) * radius;
                    const z = Math.cos(angle) * radius;

                    seats.push({
                        id: `${stand.name[0]}-T${tier + 1}-${i + 1}`,
                        label: `${stand.name[0]}${tier + 1}-${i + 1}`,
                        section: `${stand.name} • Tier ${tier + 1}`,
                        position: [x, y, z],
                        priceMultiplier: tier === 0 ? 1.5 : 1.0,
                        occupied: index < occupiedCount && (index * 3) % 4 === 0,
                    });
                    index++;
                }
            }
        }
    }

    return seats;
}

/** Smoothly transitions camera between Orbital Overview and First-Person Seat POV */
function CameraRig({
                       focusedSeat,
                       povMode,
                       venueType,
                   }: {
    focusedSeat: Seat3D | null;
    povMode: boolean;
    venueType: VenueType;
}) {
    const { camera } = useThree();
    const targetPos = useRef(new THREE.Vector3(0, 11, 16));
    const lookAtPos = useRef(new THREE.Vector3(0, 1.5, -4));

    useFrame((_, delta) => {
        if (povMode && focusedSeat) {
            // Exact eye-level position inside the selected seat!
            const [sx, sy, sz] = focusedSeat.position;
            targetPos.current.set(sx, sy + 1.05, sz);

            if (venueType === "CINEMA") {
                lookAtPos.current.set(0, 3.6, -8.5);
            } else if (venueType === "AUDITORIUM") {
                lookAtPos.current.set(0, 2.2, -7.5);
            } else {
                // Stadium looks directly at center pitch
                lookAtPos.current.set(0, 0.5, 0);
            }
        } else {
            // Elevated architectural overview
            if (venueType === "STADIUM") {
                targetPos.current.set(0, 19, 22);
                lookAtPos.current.set(0, 0, 0);
            } else {
                targetPos.current.set(0, 10.5, 13.5);
                lookAtPos.current.set(0, 2, -2);
            }
        }

        camera.position.lerp(targetPos.current, Math.min(1, delta * 4.5));
        if (povMode && focusedSeat) {
            camera.lookAt(lookAtPos.current);
        }
    });

    return !povMode ? (
        <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.07}
            maxPolarAngle={Math.PI / 2.1}
            minDistance={5}
            maxDistance={32}
        />
    ) : null;
}

/** 3D Architectural Focal Point (IMAX Screen, Keynote Stage, or Stadium Pitch) */
function VenueArchitecture({
                               venueType,
                               eventTitle,
                           }: {
    venueType: VenueType;
    eventTitle: string;
}) {
    if (venueType === "CINEMA") {
        return (
            <group position={[0, 0, -8.5]}>
                {/* Curved IMAX Screen */}
                <mesh position={[0, 3.8, 0]}>
                    <cylinderGeometry args={[14, 14, 5.6, 48, 1, true, Math.PI * 0.82, Math.PI * 0.36]} />
                    <meshStandardMaterial
                        color="#e2e8f0"
                        emissive="#38bdf8"
                        emissiveIntensity={0.42}
                        side={THREE.DoubleSide}
                        roughness={0.2}
                    />
                </mesh>
                <Text
                    position={[0, 3.9, 13.8]}
                    rotation={[0, Math.PI, 0]}
                    fontSize={0.55}
                    color="#09090b"
                    maxWidth={9}
                    textAlign="center"
                >
                    {eventTitle.toUpperCase()}
                </Text>
                {/* Dark Cinema Floor & Aisle LEDs */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 8]}>
                    <planeGeometry args={[24, 26]} />
                    <meshStandardMaterial color="#09090b" roughness={0.8} />
                </mesh>
                <mesh position={[-0.45, 0.02, 8]}>
                    <boxGeometry args={[0.06, 0.02, 16]} />
                    <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1.5} />
                </mesh>
                <mesh position={[0.45, 0.02, 8]}>
                    <boxGeometry args={[0.06, 0.02, 16]} />
                    <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1.5} />
                </mesh>
            </group>
        );
    }

    if (venueType === "AUDITORIUM") {
        return (
            <group position={[0, 0, -7.5]}>
                {/* Semi-circular Keynote Stage */}
                <mesh position={[0, 0.45, 0]}>
                    <cylinderGeometry args={[6.5, 6.8, 0.9, 48]} />
                    <meshStandardMaterial color="#18181b" metalness={0.5} roughness={0.3} />
                </mesh>
                {/* Glowing Stage Rim */}
                <mesh position={[0, 0.91, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[6.2, 6.45, 48]} />
                    <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1.4} />
                </mesh>
                {/* Main Backdrop LED Wall */}
                <mesh position={[0, 3.3, -2.5]}>
                    <boxGeometry args={[10.5, 4.2, 0.25]} />
                    <meshStandardMaterial color="#0f172a" emissive="#6366f1" emissiveIntensity={0.35} />
                </mesh>
                <Text
                    position={[0, 3.4, -2.35]}
                    fontSize={0.52}
                    color="#f8fafc"
                    maxWidth={9.2}
                    textAlign="center"
                >
                    {eventTitle}
                </Text>
                <Sparkles count={40} scale={[12, 5, 8]} position={[0, 3, 0]} size={2} color="#fbbf24" />
            </group>
        );
    }

    // STADIUM
    return (
        <group position={[0, 0, 0]}>
            {/* Lush Green Turf */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <circleGeometry args={[9.2, 64]} />
                <meshStandardMaterial color="#065f46" roughness={0.85} />
            </mesh>
            {/* Boundary Rope */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
                <ringGeometry args={[8.4, 8.6, 64]} />
                <meshStandardMaterial color="#f8fafc" emissive="#ffffff" emissiveIntensity={0.6} />
            </mesh>
            {/* Center Cricket Pitch / Concert Stage */}
            <mesh position={[0, 0.05, 0]}>
                <boxGeometry args={[1.4, 0.08, 4.6]} />
                <meshStandardMaterial color="#d6d3d1" roughness={0.6} />
            </mesh>
            <Text
                position={[0, 0.2, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.45}
                color="#ecfdf5"
                maxWidth={7}
                textAlign="center"
            >
                {eventTitle}
            </Text>
        </group>
    );
}

/** Individual Interactive 3D Chair Mesh */
function SeatMesh({
                      seat,
                      isSelected,
                      isFocused,
                      venueType,
                      onSelect,
                  }: {
    seat: Seat3D;
    isSelected: boolean;
    isFocused: boolean;
    venueType: VenueType;
    onSelect: (seat: Seat3D) => void;
}) {
    // Orient stadium seats toward center [0,0,0]; cinema/auditorium seats face -Z
    const rotationY = useMemo(() => {
        if (venueType === "STADIUM") {
            return Math.atan2(-seat.position[0], -seat.position[2]);
        }
        if (venueType === "AUDITORIUM") {
            return Math.atan2(-seat.position[0], -seat.position[2] - 4);
        }
        return 0;
    }, [seat.position, venueType]);

    const color = seat.occupied
        ? "#27272a"
        : isSelected
            ? "#10b981"
            : isFocused
                ? "#38bdf8"
                : seat.priceMultiplier > 1
                    ? "#f59e0b"
                    : "#52525b";

    return (
        <group
            position={seat.position}
            rotation={[0, rotationY, 0]}
            onClick={(e) => {
                e.stopPropagation();
                if (!seat.occupied) onSelect(seat);
            }}
        >
            {/* Seat Cushion */}
            <RoundedBox args={[0.62, 0.16, 0.58]} radius={0.05} position={[0, 0.25, 0]}>
                <meshStandardMaterial
                    color={color}
                    emissive={isSelected ? "#10b981" : isFocused ? "#0284c7" : "#000000"}
                    emissiveIntensity={isSelected || isFocused ? 0.45 : 0}
                    roughness={0.4}
                />
            </RoundedBox>
            {/* Backrest */}
            <RoundedBox args={[0.62, 0.55, 0.14]} radius={0.05} position={[0, 0.56, 0.22]}>
                <meshStandardMaterial
                    color={color}
                    emissive={isSelected ? "#10b981" : isFocused ? "#0284c7" : "#000000"}
                    emissiveIntensity={isSelected || isFocused ? 0.35 : 0}
                    roughness={0.4}
                />
            </RoundedBox>
        </group>
    );
}

export default function Venue3DScene({
                                         venueType,
                                         eventTitle,
                                         availableSeats,
                                         totalSeats,
                                         selectedSeats,
                                         focusedSeat,
                                         povMode,
                                         onToggleSeat,
                                     }: Venue3DSceneProps) {
    const seats = useMemo(
        () => generateVenueSeats(venueType, totalSeats, availableSeats),
        [venueType, totalSeats, availableSeats]
    );

    return (
        <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl">
            <Canvas camera={{ position: [0, 10.5, 13.5], fov: 50 }}>
                <color attach="background" args={["#09090b"]} />
                <fog attach="fog" args={["#09090b", 18, 48]} />
                <ambientLight intensity={0.55} />
                <pointLight position={[0, 12, 4]} intensity={1.8} color="#ffffff" />
                <spotLight position={[0, 16, -6]} angle={0.5} penumbra={0.8} intensity={2.2} color="#38bdf8" />

                <VenueArchitecture venueType={venueType} eventTitle={eventTitle} />

                {seats.map((seat) => (
                    <SeatMesh
                        key={seat.id}
                        seat={seat}
                        venueType={venueType}
                        isSelected={selectedSeats.includes(seat.id)}
                        isFocused={focusedSeat?.id === seat.id}
                        onSelect={onToggleSeat}
                    />
                ))}

                <CameraRig focusedSeat={focusedSeat} povMode={povMode} venueType={venueType} />
                <Environment preset="night" />
            </Canvas>

            {/* Bottom Spatial HUD Legend */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 px-4 py-2.5 rounded-xl text-xs">
                <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-zinc-600 inline-block" /> Standard
          </span>
                    <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Prime / VIP
          </span>
                    <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Selected
          </span>
                    <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-zinc-800 border border-zinc-700 inline-block" /> Occupied
          </span>
                </div>
                <span className="text-zinc-400 font-mono">
          {povMode
              ? "POV SIGHTLINE ACTIVE — Viewing stage from seat eye-level"
              : "DRAG TO ORBIT • SCROLL TO ZOOM • CLICK ANY SEAT"}
        </span>
            </div>
        </div>
    );
}