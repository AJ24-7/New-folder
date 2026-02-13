/// Dashboard Stats Model
class DashboardStats {
  final int totalUsers;
  final int lastMonthUsers;
  final int thisMonthUsers;
  final int activeMembers;
  final int lastMonthMembers;
  final int thisMonthMembers;
  final int pendingGyms;
  final int pendingTrainers;
  final double combinedTotalRevenue;
  final double combinedThisMonthRevenue;
  final int totalSubscriptions;
  final int activeSubscriptions;
  final int trialSubscriptions;
  final int expiredSubscriptions;
  
  DashboardStats({
    required this.totalUsers,
    required this.lastMonthUsers,
    required this.thisMonthUsers,
    required this.activeMembers,
    required this.lastMonthMembers,
    required this.thisMonthMembers,
    required this.pendingGyms,
    required this.pendingTrainers,
    required this.combinedTotalRevenue,
    required this.combinedThisMonthRevenue,
    required this.totalSubscriptions,
    required this.activeSubscriptions,
    required this.trialSubscriptions,
    required this.expiredSubscriptions,
  });
  
  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      totalUsers: json['totalUsers'] ?? 0,
      lastMonthUsers: json['lastMonthUsers'] ?? 0,
      thisMonthUsers: json['thisMonthUsers'] ?? 0,
      activeMembers: json['activeMembers'] ?? 0,
      lastMonthMembers: json['lastMonthMembers'] ?? 0,
      thisMonthMembers: json['thisMonthMembers'] ?? 0,
      pendingGyms: json['pendingGyms'] ?? 0,
      pendingTrainers: json['pendingTrainers'] ?? 0,
      combinedTotalRevenue: (json['combinedTotalRevenue'] ?? 0).toDouble(),
      combinedThisMonthRevenue: (json['combinedThisMonthRevenue'] ?? 0).toDouble(),
      totalSubscriptions: json['totalSubscriptions'] ?? 0,
      activeSubscriptions: json['activeSubscriptions'] ?? 0,
      trialSubscriptions: json['trialSubscriptions'] ?? 0,
      expiredSubscriptions: json['expiredSubscriptions'] ?? 0,
    );
  }
  
  double get usersGrowthPercentage {
    if (lastMonthUsers == 0) return 100.0;
    return ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100;
  }
  
  double get membersGrowthPercentage {
    if (lastMonthMembers == 0) return 100.0;
    return ((thisMonthMembers - lastMonthMembers) / lastMonthMembers) * 100;
  }
}
