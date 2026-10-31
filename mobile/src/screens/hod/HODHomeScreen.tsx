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

export const HODHomeScreen: React.FC = () => {
  const { user, logout } = useMobileAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      const res = await mobileApi.get("/leaves/");
      setLeaves(res.data);
    } catch (err) {
      console.error("Failed to fetch leaves", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleForward = async (leaveId: number, teacherName: string) => {
    Alert.alert(
      "Forward to Admin",
      `Endorse leave request for ${teacherName} and forward to Administration?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Forward",
          onPress: async () => {
            await mobileApi.post(`/leaves/${leaveId}/hod-forward`, { note: "Recommended by HOD on mobile." });
            Alert.alert("Forwarded", "Leave request forwarded to Admin.");
            fetchLeaves();
          },
        },
      ]
    );
  };

  const handleDeny = async (leaveId: number) => {
    Alert.alert("Deny Request", "Deny this leave application?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Deny",
        style: "destructive",
        onPress: async () => {
          await mobileApi.post(`/leaves/${leaveId}/hod-deny`, { note: "Denied by HOD on mobile." });
          Alert.alert("Denied", "Leave request denied.");
          fetchLeaves();
        },
      },
    ]);
  };

  const pendingLeaves = leaves.filter((l) => l.status === "Pending_HOD");

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>HOD Dashboard</Text>
          <Text style={styles.subGreeting}>Department of Computer Applications · {user?.full_name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>42</Text>
          <Text style={styles.statLabel}>Faculty</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>386</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>3</Text>
          <Text style={styles.statLabel}>Sections</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: "#D97706" }]}>{pendingLeaves.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Leave Approval Inbox */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Requests Inbox ({pendingLeaves.length} Pending)</Text>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginVertical: 20 }} />
        ) : pendingLeaves.length === 0 ? (
          <Text style={styles.emptyText}>All leave requests reviewed. Inbox clear!</Text>
        ) : (
          pendingLeaves.map((lr) => (
            <View key={lr.leave_request_id} style={styles.leaveCard}>
              <View style={styles.leaveTop}>
                <Text style={styles.teacherName}>{lr.teacher_name}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{lr.leave_type}</Text>
                </View>
              </View>

              <Text style={styles.datesText}>
                {lr.start_date} to {lr.end_date} · {lr.affected_sessions_count} Lectures Affected
              </Text>

              <Text style={styles.reasonText}>"{lr.reason}"</Text>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.denyBtn}
                  onPress={() => handleDeny(lr.leave_request_id)}
                >
                  <Text style={styles.denyText}>Deny</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forwardBtn}
                  onPress={() => handleForward(lr.leave_request_id, lr.teacher_name)}
                >
                  <Text style={styles.forwardText}>Forward to Admin →</Text>
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
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
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
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
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
    borderColor: "#FDE68A",
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
  datesText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  reasonText: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#475569",
    marginVertical: 8,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  denyBtn: {
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  denyText: {
    color: "#E11D48",
    fontSize: 11,
    fontWeight: "bold",
  },
  forwardBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  forwardText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
});
