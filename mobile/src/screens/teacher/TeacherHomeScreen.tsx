import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { mobileApi } from "../../api/client";
import { useMobileAuth } from "../../context/AuthContext";

export const TeacherHomeScreen: React.FC = () => {
  const { user, logout } = useMobileAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedule = async () => {
    try {
      const res = await mobileApi.get("/timetable/teacher/today");
      setClasses(res.data);
    } catch (err) {
      console.error("Failed to load teacher classes", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleMarkAttendance = async (session: any) => {
    try {
      const rosterRes = await mobileApi.get(`/attendance/session/${session.session_id}/roster`);
      const students = rosterRes.data.students;
      if (students.length === 0) {
        Alert.alert("Notice", "No students enrolled in this section.");
        return;
      }
      // Auto mark all present on quick tap
      await mobileApi.post(`/attendance/session/${session.session_id}`, {
        records: students.map((st: any) => ({
          student_id: st.student_id,
          status: "Present",
        })),
      });
      Alert.alert("Success", `Attendance recorded for all ${students.length} students in ${session.subject_name}!`);
      fetchSchedule();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || "Failed to mark attendance.");
    }
  };

  const handleTransfer = async (session: any) => {
    try {
      const subsRes = await mobileApi.get(`/transfers/eligible-substitutes?session_id=${session.session_id}`);
      const subs = subsRes.data;
      if (subs.length === 0) {
        Alert.alert("No Substitutes", "No available faculty found for this slot.");
        return;
      }
      const topSub = subs[0];
      Alert.alert(
        "Instant Transfer",
        `Transfer ${session.subject_name} to ${topSub.full_name}? (Continuity Safe: ${topSub.is_continuity_safe ? "Yes" : "Caution"})`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm Transfer",
            onPress: async () => {
              await mobileApi.post("/transfers/", {
                session_id: session.session_id,
                substitute_teacher_id: topSub.teacher_id,
                reason: "Mobile peer transfer",
              });
              Alert.alert("Transferred!", `Class transferred to ${topSub.full_name}.`);
              fetchSchedule();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Transfer Error", err.response?.data?.detail || "Transfer failed.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning, {user?.full_name}! 👋</Text>
          <Text style={styles.subGreeting}>Faculty · Department of Computer Applications</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Continuity Safe Badge */}
      <View style={styles.continuityCard}>
        <Text style={styles.continuityTitle}>Workload Continuity: Compliant</Text>
        <Text style={styles.continuitySub}>Max 2 consecutive lectures enforced · 15-min resets</Text>
      </View>

      {/* Today's Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Assigned Lectures</Text>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginVertical: 20 }} />
        ) : classes.length === 0 ? (
          <Text style={styles.emptyText}>No classes scheduled for today.</Text>
        ) : (
          classes.map((cls) => (
            <View key={cls.session_id} style={styles.classCard}>
              <View style={styles.classTop}>
                <View>
                  <Text style={styles.subjectTitle}>{cls.subject_name}</Text>
                  <Text style={styles.classInfo}>
                    {cls.room_code} · Section {cls.section_name} ({cls.start_time} - {cls.end_time})
                  </Text>
                </View>
                {cls.status === "Completed" && (
                  <View style={styles.markedBadge}>
                    <Text style={styles.markedText}>Marked</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.markBtn}
                  onPress={() => handleMarkAttendance(cls)}
                >
                  <Text style={styles.markBtnText}>
                    {cls.status === "Completed" ? "Re-Mark Attendance" : "Mark Attendance"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.transferBtn}
                  onPress={() => handleTransfer(cls)}
                >
                  <Text style={styles.transferBtnText}>Transfer</Text>
                </TouchableOpacity>
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
  continuityCard: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  continuityTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#065F46",
  },
  continuitySub: {
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0F172A",
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  classTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0F172A",
  },
  classInfo: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },
  markedBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  markedText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#065F46",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  markBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  markBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  transferBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  transferBtnText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "bold",
  },
});
