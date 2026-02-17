// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Gym-Wale Admin';

  @override
  String get dashboard => 'Dashboard';

  @override
  String get members => 'Members';

  @override
  String get activeMembers => 'Active Members';

  @override
  String get expiredMembers => 'Expired Members';

  @override
  String get noExpiredMembers => 'No expired members found';

  @override
  String expiredMembersCount(int count) {
    return '$count Expired Member(s)';
  }

  @override
  String get trainers => 'Trainers';

  @override
  String get attendance => 'Attendance';

  @override
  String get payments => 'Payments';

  @override
  String get equipment => 'Equipment';

  @override
  String get offers => 'Offers & Coupons';

  @override
  String get support => 'Support & Reviews';

  @override
  String get settings => 'Settings';

  @override
  String get logout => 'Logout';

  @override
  String get dashboardOverview => 'Dashboard Overview';

  @override
  String get totalMembers => 'Total Members';

  @override
  String get totalRevenue => 'Total Revenue';

  @override
  String get pendingApprovals => 'Pending Approvals';

  @override
  String get quickActions => 'Quick Actions';

  @override
  String get addMember => 'Add Member';

  @override
  String get sendNotification => 'Send Notification';

  @override
  String get generateReport => 'Generate Report';

  @override
  String get profile => 'Profile';

  @override
  String get gymProfile => 'Gym Profile';

  @override
  String get changePassword => 'Change Password';

  @override
  String get notifications => 'Notifications';

  @override
  String get viewMode => 'View Mode';

  @override
  String get editMode => 'Edit Mode';

  @override
  String get enableEditMode => 'Enable Edit Mode';

  @override
  String get save => 'Save';

  @override
  String get cancel => 'Cancel';

  @override
  String get basicInformation => 'Basic Information';

  @override
  String get gymName => 'Gym Name';

  @override
  String get ownerName => 'Owner Name';

  @override
  String get email => 'Email';

  @override
  String get phone => 'Phone';

  @override
  String get supportEmail => 'Support Email';

  @override
  String get supportPhone => 'Support Phone';

  @override
  String get locationInformation => 'Location Information';

  @override
  String get address => 'Address';

  @override
  String get city => 'City';

  @override
  String get state => 'State';

  @override
  String get pincode => 'Pincode';

  @override
  String get landmark => 'Landmark';

  @override
  String get operationalInformation => 'Operational Information';

  @override
  String get openingTime => 'Opening Time';

  @override
  String get closingTime => 'Closing Time';

  @override
  String get currentMembers => 'Current Members';

  @override
  String get description => 'Description';

  @override
  String get currentPassword => 'Current Password';

  @override
  String get newPassword => 'New Password';

  @override
  String get confirmPassword => 'Confirm Password';

  @override
  String get passwordStrength => 'Password Strength';

  @override
  String get weak => 'Weak';

  @override
  String get medium => 'Medium';

  @override
  String get strong => 'Strong';

  @override
  String get theme => 'Theme';

  @override
  String get language => 'Language';

  @override
  String get lightMode => 'Light Mode';

  @override
  String get darkMode => 'Dark Mode';

  @override
  String get systemDefault => 'System Default';

  @override
  String get search => 'Search';

  @override
  String get filter => 'Filter';

  @override
  String get export => 'Export';

  @override
  String get import => 'Import';

  @override
  String get refresh => 'Refresh';

  @override
  String get memberList => 'Member List';

  @override
  String get trainerList => 'Trainer List';

  @override
  String get attendanceRecords => 'Attendance Records';

  @override
  String get paymentHistory => 'Payment History';

  @override
  String get equipmentInventory => 'Equipment Inventory';

  @override
  String get activeStatus => 'Active';

  @override
  String get inactiveStatus => 'Inactive';

  @override
  String get pendingStatus => 'Pending';

  @override
  String get expiredStatus => 'Expired';

  @override
  String get success => 'Success';

  @override
  String get error => 'Error';

  @override
  String get warning => 'Warning';

  @override
  String get info => 'Info';

  @override
  String get confirmAction => 'Confirm Action';

  @override
  String get areYouSure => 'Are you sure?';

  @override
  String get yes => 'Yes';

  @override
  String get no => 'No';

  @override
  String get loading => 'Loading...';

  @override
  String get noDataFound => 'No data found';

  @override
  String get tryAgain => 'Try Again';

  @override
  String get todayAttendance => 'Today\'s Attendance';

  @override
  String get weeklyStats => 'Weekly Stats';

  @override
  String get monthlyRevenue => 'Monthly Revenue';

  @override
  String get activeCoupons => 'Active Coupons';

  @override
  String get addNewMember => 'Add New Member';

  @override
  String get editMember => 'Edit Member';

  @override
  String get deleteMember => 'Delete Member';

  @override
  String get viewDetails => 'View Details';

  @override
  String get trainerCertifications => 'Trainer Certifications';

  @override
  String get specialization => 'Specialization';

  @override
  String get experience => 'Experience';

  @override
  String get rating => 'Rating';

  @override
  String get scanQRCode => 'Scan QR Code';

  @override
  String get manualEntry => 'Manual Entry';

  @override
  String get markAttendance => 'Mark Attendance';

  @override
  String get receivedPayments => 'Received Payments';

  @override
  String get pendingPayments => 'Pending Payments';

  @override
  String get duePayments => 'Due Payments';

  @override
  String get profitLoss => 'Profit/Loss';

  @override
  String get equipmentMaintenance => 'Equipment Maintenance';

  @override
  String get maintenanceDue => 'Maintenance Due';

  @override
  String get workingCondition => 'Working Condition';

  @override
  String get needsRepair => 'Needs Repair';

  @override
  String get createOffer => 'Create Offer';

  @override
  String get generateCoupon => 'Generate Coupon';

  @override
  String get activeCampaigns => 'Active Campaigns';

  @override
  String get offerTemplates => 'Offer Templates';

  @override
  String get customerReviews => 'Customer Reviews';

  @override
  String get grievances => 'Grievances';

  @override
  String get communications => 'Communications';

  @override
  String get replyToReview => 'Reply to Review';

  @override
  String get supportAndReviews => 'Support & Reviews';

  @override
  String get autoRefreshEnabled => 'Auto-refresh enabled';

  @override
  String get autoRefreshDisabled => 'Auto-refresh disabled';

  @override
  String get refreshNow => 'Refresh now';

  @override
  String get reviews => 'Reviews';

  @override
  String get chats => 'Chats';

  @override
  String get unread => 'unread';

  @override
  String get pending => 'pending';

  @override
  String get open => 'open';

  @override
  String get retry => 'Retry';

  @override
  String get gymConfiguration => 'Gym Configuration';

  @override
  String get adminManagement => 'Admin Management';

  @override
  String get securitySettings => 'Security Settings';

  @override
  String get security => 'Security';

  @override
  String get backupData => 'Backup Data';

  @override
  String get restoreData => 'Restore Data';

  @override
  String get sessionTimer => 'Session Timer';

  @override
  String get sessionActive => 'Session Active';

  @override
  String get sessionExpiry => 'Session Expiry';

  @override
  String get timeRemaining => 'Time Remaining';

  @override
  String get sessionWillExpireSoon => 'Your session will expire soon';

  @override
  String get sessionExpiredTitle => 'Session Expired';

  @override
  String get sessionExpiredMessage =>
      'Your session has expired. Please login again.';

  @override
  String get sessionWarningTitle => 'Session Expiring Soon';

  @override
  String sessionWarningMessage(Object time) {
    return 'Your session will expire in $time. Do you want to extend the session?';
  }

  @override
  String get extendSession => 'Extend Session';

  @override
  String get continueWorking => 'Continue Working';

  @override
  String get autoLogoutEnabled => 'Auto-logout enabled';

  @override
  String get sessionManagement => 'Session Management';

  @override
  String get sessionInfo => 'Session Information';

  @override
  String get loggedInSince => 'Logged in since';

  @override
  String get autoSessionTimeout => 'Auto Session Timeout';

  @override
  String get autoSessionTimeoutDescription =>
      'Set automatic logout time for security';

  @override
  String get sessionTimeoutDuration => 'Session Timeout Duration';

  @override
  String get threeDays => '3 Days';

  @override
  String get sevenDays => '7 Days';

  @override
  String get oneMonth => '1 Month (30 Days)';

  @override
  String currentTimeoutSetting(String duration) {
    return 'Current: $duration';
  }

  @override
  String get sessionTimeoutUpdated => 'Session timeout updated successfully';

  @override
  String get failedToUpdateSessionTimeout => 'Failed to update session timeout';

  @override
  String get selectSessionTimeout => 'Select Session Timeout';

  @override
  String get paymentManagement => 'Payment Management';

  @override
  String get addPayment => 'Add Payment';

  @override
  String get amountReceived => 'Amount Received';

  @override
  String get amountPaid => 'Amount Paid';

  @override
  String get paymentTrends => 'Payment Trends';

  @override
  String get dues => 'Dues';

  @override
  String get recentPayments => 'Recent Payments';

  @override
  String get paymentType => 'Payment Type';

  @override
  String get paymentMethod => 'Payment Method';

  @override
  String get amount => 'Amount';

  @override
  String get memberName => 'Member Name';

  @override
  String get notes => 'Notes';

  @override
  String get paidOn => 'Paid On';

  @override
  String get dueOn => 'Due On';

  @override
  String get markAsPaid => 'Mark as Paid';

  @override
  String get totalEquipment => 'Total Equipment';

  @override
  String get availableEquipment => 'Available Equipment';

  @override
  String get maintenanceEquipment => 'Maintenance';

  @override
  String get outOfOrderEquipment => 'Out of Order';

  @override
  String get addEquipment => 'Add Equipment';

  @override
  String get editEquipment => 'Edit Equipment';

  @override
  String get deleteEquipment => 'Delete Equipment';

  @override
  String get equipmentName => 'Equipment Name';

  @override
  String get brand => 'Brand';

  @override
  String get model => 'Model';

  @override
  String get category => 'Category';

  @override
  String get quantity => 'Quantity';

  @override
  String get status => 'Status';

  @override
  String get purchaseDate => 'Purchase Date';

  @override
  String get price => 'Price';

  @override
  String get warranty => 'Warranty';

  @override
  String get location => 'Location';

  @override
  String get specifications => 'Specifications';

  @override
  String get photos => 'Photos';

  @override
  String get addPhotos => 'Add Photos';

  @override
  String get searchEquipment => 'Search equipment...';

  @override
  String get allCategories => 'All Categories';

  @override
  String get allStatuses => 'All Statuses';

  @override
  String get sortBy => 'Sort By';

  @override
  String get name => 'Name';

  @override
  String get months => 'months';

  @override
  String get noEquipmentFound => 'No Equipment Found';

  @override
  String get noEquipmentFoundDescription =>
      'Start by adding your first piece of equipment to track and manage your gym inventory.';

  @override
  String get confirmDelete => 'Confirm Delete';

  @override
  String confirmDeleteEquipmentMessage(String equipmentName) {
    return 'Are you sure you want to delete $equipmentName? This action cannot be undone.';
  }

  @override
  String get delete => 'Delete';
}
