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
import { useMobileAuth } from "../../context/AuthContext";

export const StudentHomeScreen: React.FC = () => {
  const { user, logout } = useMobileAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await mobileApi.get("/timetable/student/today");
        setClasses(res.data);
      } catch (err) {
        console.error("Failed to load classes", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning, {user?.full_name?.split(" ")[0]}! 👋</Text>
          <Text style={styles.subGreeting}>BCA · Sem 3 · Section A (Morning Shift)</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Top Banner Stat */}
      <View style={styles.attendanceBanner}>
        <View style={styles.donutPlaceholder}>
          <Text style={styles.donutText}>73%</Text>
        </View>
        <View style={styles.bannerInfo}>
          <Text style={styles.bannerTitle}>Attendance Standing</Text>
          <Text style={styles.bannerSubtitle}>70 Attended / 96 Held · 26 Absent</Text>
          <Text style={styles.bannerStatus}>Status: At Risk (Min 75% required)</Text>
        </View>
      </View>

      {/* Today's Classes List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Lectures</Text>
        <Text style={styles.sectionSubtitle}>65-min classes · 15-min mid-shift break</Text>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginVertical: 20 }} />
        ) : classes.length === 0 ? (
          <Text style={styles.emptyText}>No classes scheduled for today.</Text>
        ) : (
          classes.map((cls, idx) => (
            <View key={cls.session_id || idx} style={styles.classCard}>
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>{cls.start_time}</Text>
                <Text style={styles.timeSubText}>{cls.end_time}</Text>
              </View>
              <View style={styles.classDetails}>
                <Text style={styles.subjectName}>{cls.subject_name}</Text>
                <Text style={styles.classMeta}>
                  {cls.room_code} · {cls.teacher_name}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{idx === 0 ? "Ongoing" : idx === 1 ? "Next" : "Upcoming"}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
  },
  subGreeting: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  logoutText: {
    fontSize: 11,
    color: "#E11D48",
    fontWeight: "bold",
  },
  attendanceBanner: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 16,
  },
  donutPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  donutText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1E3A8A",
  },
  bannerSubtitle: {
    fontSize: 11,
    color: "#3B82F6",
    marginTop: 2,
  },
  bannerStatus: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "bold",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 12,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginVertical: 20,
  },
  classCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  timeBadge: {
    width: 55,
    marginRight: 10,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1E293B",
  },
  timeSubText: {
    fontSize: 10,
    color: "#64748B",
  },
  classDetails: {
    flex: 1,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0F172A",
  },
  classMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569",
  },
});
