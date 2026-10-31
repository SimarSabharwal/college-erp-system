import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { mobileApi } from "../../api/client";

export const StudentTimetableScreen: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [weekGrid, setWeekGrid] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const res = await mobileApi.get("/timetable/section/1/week");
        setWeekGrid(res.data);
      } catch (err) {
        console.error("Failed to load weekly timetable", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, []);

  const daySlots = weekGrid.filter((s) => s.day_of_week === selectedDay);

  return (
    <View style={styles.container}>
      {/* Day Selector Chips */}
      <View style={styles.dayRow}>
        {days.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.dayChip, selectedDay === d && styles.activeDayChip]}
            onPress={() => setSelectedDay(d)}
          >
            <Text
              style={[
                styles.dayChipText,
                selectedDay === d && styles.activeDayChipText,
              ]}
            >
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginTop: 40 }} />
        ) : daySlots.length === 0 ? (
          <Text style={styles.emptyText}>No classes scheduled for {selectedDay}.</Text>
        ) : (
          daySlots.map((slot) => (
            <View key={slot.detail_id} style={styles.slotCard}>
              <View style={styles.slotOrderBadge}>
                <Text style={styles.slotOrderText}>Slot {slot.slot_order}</Text>
                <Text style={styles.slotTimeText}>{slot.start_time} - {slot.end_time}</Text>
              </View>
              <View style={styles.slotInfo}>
                <Text style={styles.subjectText}>{slot.subject_name}</Text>
                <Text style={styles.metaText}>
                  {slot.room_code} · {slot.teacher_name}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  dayRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "space-between",
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  activeDayChip: {
    backgroundColor: "#2563EB",
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748B",
  },
  activeDayChipText: {
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 16,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 40,
  },
  slotCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  slotOrderBadge: {
    width: 80,
    marginRight: 10,
  },
  slotOrderText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2563EB",
  },
  slotTimeText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  slotInfo: {
    flex: 1,
  },
  subjectText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0F172A",
  },
  metaText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
});
