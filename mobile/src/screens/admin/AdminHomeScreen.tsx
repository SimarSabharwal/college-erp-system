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

export const AdminHomeScreen: React.FC = () => {
  const { user, logout } = useMobileAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    try {
      const [leavesRes, ttRes] = await Promise.all([
        mobileApi.get("/leaves/"),
        mobileApi.get("/timetable/latest"),
      ]);
      setLeaves(leavesRes.data);
      setTimetable(ttRes.data);
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateTimetable = async () => {
    setGenerating(true);
    try {
      const res = await mobileApi.post("/timetable/generate", {
        program_id: 1,
        semester_id: 1,
        academic_year_id: 1,
        name: "BCA Semester 3 Conflict-Free Timetable",
      });
      Alert.alert("Success", `Timetable generated! ${res.data.total_slots_scheduled} conflict-free slots scheduled.`);
      fetchData();
    } catch (err: any) {
      Alert.alert("Generation Failed", err.response?.data?.detail || "Could not generate timetable.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveLeave = async (leave: any) => {
    try {
      const subRes = await mobileApi.get(`/leaves/${leave.leave_request_id}/substitutes`);
      const sessionsWithCands = subRes.data;

      const assignments = sessionsWithCands.map((item: any) => ({
        session_id: item.session.session_id,
        substitute_teacher_id: item.candidates[0]?.teacher_id || 2,
        continuity_override: false,
      }));

      await mobileApi.post(`/leaves/${leave.leave_request_id}/admin-approve`, {
        assignments,
        note: "Approved via Admin Mobile Portal",
      });

      Alert.alert("Approved & Reassigned", `Leave approved for ${leave.teacher_name} and substitutes assigned.`);
      fetchData();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || "Failed to approve leave.");
    }
  };

  const pendingAdminLeaves = leaves.filter((l) => l.status === "Pending_Admin");

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Operations</Text>
          <Text style={styles.subGreeting}>System Administration · {user?.full_name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* 4 Stat Boxes */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>1,248</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>86</Text>
          <Text style={styles.statLabel}>Faculty</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>6</Text>
          <Text style={styles.statLabel}>Depts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{timetable?.total_slots_scheduled || 39}</Text>
          <Text style={styles.statLabel}>Slots</Text>
        </View>
      </View>

      {/* Generator Stepper Action */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Timetable Engine (CSP Backtracking)</Text>
        <Text style={styles.cardSubtitle}>
          Enforces zero double-booking, room capacity, workload continuity, and teacher-shift locks
        </Text>

        <TouchableOpacity
          style={styles.genBtn}
          onPress={handleGenerateTimetable}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.genBtnText}>Run Timetable Generator</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Leave Reassignment Desk */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Leave Reassignment Desk ({pendingAdminLeaves.length} Pending)
        </Text>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginVertical: 20 }} />
        ) : pendingAdminLeaves.length === 0 ? (
          <Text style={styles.emptyText}>No pending leaves requiring substitute reassignment.</Text>
        ) : (
          pendingAdminLeaves.map((lr) => (
            <View key={lr.leave_request_id} style={styles.leaveCard}>
              <View style={styles.leaveTop}>
                <Text style={styles.teacherName}>{lr.teacher_name}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{lr.leave_type}</Text>
                </View>
              </View>

              <Text style={styles.metaLine}>
                {lr.department_name} · {lr.start_date} to {lr.end_date}
              </Text>
              <Text style={styles.hodNote}>HOD Endorsement: "{lr.hod_note || "Recommended."}"</Text>

              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleApproveLeave(lr)}
              >
                <Text style={styles.approveBtnText}>Approve & Auto-Assign Substitutes</Text>
              </TouchableOpacity>
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
    fontSize: 11,
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
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statNum: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0F172A",
  },
  cardSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  genBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  genBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
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
  leaveCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  leaveTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teacherName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0F172A",
  },
  typeBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#6D28D9",
  },
  metaLine: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },
  hodNote: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#475569",
    marginVertical: 6,
  },
  approveBtn: {
    backgroundColor: "#7C3AED",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  approveBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
});
