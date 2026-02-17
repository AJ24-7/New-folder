import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Gym-Wale Admin'**
  String get appTitle;

  /// No description provided for @dashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get dashboard;

  /// No description provided for @members.
  ///
  /// In en, this message translates to:
  /// **'Members'**
  String get members;

  /// No description provided for @activeMembers.
  ///
  /// In en, this message translates to:
  /// **'Active Members'**
  String get activeMembers;

  /// No description provided for @expiredMembers.
  ///
  /// In en, this message translates to:
  /// **'Expired Members'**
  String get expiredMembers;

  /// No description provided for @noExpiredMembers.
  ///
  /// In en, this message translates to:
  /// **'No expired members found'**
  String get noExpiredMembers;

  /// No description provided for @expiredMembersCount.
  ///
  /// In en, this message translates to:
  /// **'{count} Expired Member(s)'**
  String expiredMembersCount(int count);

  /// No description provided for @trainers.
  ///
  /// In en, this message translates to:
  /// **'Trainers'**
  String get trainers;

  /// No description provided for @attendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get attendance;

  /// No description provided for @payments.
  ///
  /// In en, this message translates to:
  /// **'Payments'**
  String get payments;

  /// No description provided for @equipment.
  ///
  /// In en, this message translates to:
  /// **'Equipment'**
  String get equipment;

  /// No description provided for @offers.
  ///
  /// In en, this message translates to:
  /// **'Offers & Coupons'**
  String get offers;

  /// No description provided for @support.
  ///
  /// In en, this message translates to:
  /// **'Support & Reviews'**
  String get support;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get logout;

  /// No description provided for @dashboardOverview.
  ///
  /// In en, this message translates to:
  /// **'Dashboard Overview'**
  String get dashboardOverview;

  /// No description provided for @totalMembers.
  ///
  /// In en, this message translates to:
  /// **'Total Members'**
  String get totalMembers;

  /// No description provided for @totalRevenue.
  ///
  /// In en, this message translates to:
  /// **'Total Revenue'**
  String get totalRevenue;

  /// No description provided for @pendingApprovals.
  ///
  /// In en, this message translates to:
  /// **'Pending Approvals'**
  String get pendingApprovals;

  /// No description provided for @quickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick Actions'**
  String get quickActions;

  /// No description provided for @addMember.
  ///
  /// In en, this message translates to:
  /// **'Add Member'**
  String get addMember;

  /// No description provided for @sendNotification.
  ///
  /// In en, this message translates to:
  /// **'Send Notification'**
  String get sendNotification;

  /// No description provided for @generateReport.
  ///
  /// In en, this message translates to:
  /// **'Generate Report'**
  String get generateReport;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @gymProfile.
  ///
  /// In en, this message translates to:
  /// **'Gym Profile'**
  String get gymProfile;

  /// No description provided for @changePassword.
  ///
  /// In en, this message translates to:
  /// **'Change Password'**
  String get changePassword;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @viewMode.
  ///
  /// In en, this message translates to:
  /// **'View Mode'**
  String get viewMode;

  /// No description provided for @editMode.
  ///
  /// In en, this message translates to:
  /// **'Edit Mode'**
  String get editMode;

  /// No description provided for @enableEditMode.
  ///
  /// In en, this message translates to:
  /// **'Enable Edit Mode'**
  String get enableEditMode;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @basicInformation.
  ///
  /// In en, this message translates to:
  /// **'Basic Information'**
  String get basicInformation;

  /// No description provided for @gymName.
  ///
  /// In en, this message translates to:
  /// **'Gym Name'**
  String get gymName;

  /// No description provided for @ownerName.
  ///
  /// In en, this message translates to:
  /// **'Owner Name'**
  String get ownerName;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @phone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get phone;

  /// No description provided for @supportEmail.
  ///
  /// In en, this message translates to:
  /// **'Support Email'**
  String get supportEmail;

  /// No description provided for @supportPhone.
  ///
  /// In en, this message translates to:
  /// **'Support Phone'**
  String get supportPhone;

  /// No description provided for @locationInformation.
  ///
  /// In en, this message translates to:
  /// **'Location Information'**
  String get locationInformation;

  /// No description provided for @address.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get address;

  /// No description provided for @city.
  ///
  /// In en, this message translates to:
  /// **'City'**
  String get city;

  /// No description provided for @state.
  ///
  /// In en, this message translates to:
  /// **'State'**
  String get state;

  /// No description provided for @pincode.
  ///
  /// In en, this message translates to:
  /// **'Pincode'**
  String get pincode;

  /// No description provided for @landmark.
  ///
  /// In en, this message translates to:
  /// **'Landmark'**
  String get landmark;

  /// No description provided for @operationalInformation.
  ///
  /// In en, this message translates to:
  /// **'Operational Information'**
  String get operationalInformation;

  /// No description provided for @openingTime.
  ///
  /// In en, this message translates to:
  /// **'Opening Time'**
  String get openingTime;

  /// No description provided for @closingTime.
  ///
  /// In en, this message translates to:
  /// **'Closing Time'**
  String get closingTime;

  /// No description provided for @currentMembers.
  ///
  /// In en, this message translates to:
  /// **'Current Members'**
  String get currentMembers;

  /// No description provided for @description.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get description;

  /// No description provided for @currentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current Password'**
  String get currentPassword;

  /// No description provided for @newPassword.
  ///
  /// In en, this message translates to:
  /// **'New Password'**
  String get newPassword;

  /// No description provided for @confirmPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm Password'**
  String get confirmPassword;

  /// No description provided for @passwordStrength.
  ///
  /// In en, this message translates to:
  /// **'Password Strength'**
  String get passwordStrength;

  /// No description provided for @weak.
  ///
  /// In en, this message translates to:
  /// **'Weak'**
  String get weak;

  /// No description provided for @medium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get medium;

  /// No description provided for @strong.
  ///
  /// In en, this message translates to:
  /// **'Strong'**
  String get strong;

  /// No description provided for @theme.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get theme;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @lightMode.
  ///
  /// In en, this message translates to:
  /// **'Light Mode'**
  String get lightMode;

  /// No description provided for @darkMode.
  ///
  /// In en, this message translates to:
  /// **'Dark Mode'**
  String get darkMode;

  /// No description provided for @systemDefault.
  ///
  /// In en, this message translates to:
  /// **'System Default'**
  String get systemDefault;

  /// No description provided for @search.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get search;

  /// No description provided for @filter.
  ///
  /// In en, this message translates to:
  /// **'Filter'**
  String get filter;

  /// No description provided for @export.
  ///
  /// In en, this message translates to:
  /// **'Export'**
  String get export;

  /// No description provided for @import.
  ///
  /// In en, this message translates to:
  /// **'Import'**
  String get import;

  /// No description provided for @refresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get refresh;

  /// No description provided for @memberList.
  ///
  /// In en, this message translates to:
  /// **'Member List'**
  String get memberList;

  /// No description provided for @trainerList.
  ///
  /// In en, this message translates to:
  /// **'Trainer List'**
  String get trainerList;

  /// No description provided for @attendanceRecords.
  ///
  /// In en, this message translates to:
  /// **'Attendance Records'**
  String get attendanceRecords;

  /// No description provided for @paymentHistory.
  ///
  /// In en, this message translates to:
  /// **'Payment History'**
  String get paymentHistory;

  /// No description provided for @equipmentInventory.
  ///
  /// In en, this message translates to:
  /// **'Equipment Inventory'**
  String get equipmentInventory;

  /// No description provided for @activeStatus.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get activeStatus;

  /// No description provided for @inactiveStatus.
  ///
  /// In en, this message translates to:
  /// **'Inactive'**
  String get inactiveStatus;

  /// No description provided for @pendingStatus.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get pendingStatus;

  /// No description provided for @expiredStatus.
  ///
  /// In en, this message translates to:
  /// **'Expired'**
  String get expiredStatus;

  /// No description provided for @success.
  ///
  /// In en, this message translates to:
  /// **'Success'**
  String get success;

  /// No description provided for @error.
  ///
  /// In en, this message translates to:
  /// **'Error'**
  String get error;

  /// No description provided for @warning.
  ///
  /// In en, this message translates to:
  /// **'Warning'**
  String get warning;

  /// No description provided for @info.
  ///
  /// In en, this message translates to:
  /// **'Info'**
  String get info;

  /// No description provided for @confirmAction.
  ///
  /// In en, this message translates to:
  /// **'Confirm Action'**
  String get confirmAction;

  /// No description provided for @areYouSure.
  ///
  /// In en, this message translates to:
  /// **'Are you sure?'**
  String get areYouSure;

  /// No description provided for @yes.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get yes;

  /// No description provided for @no.
  ///
  /// In en, this message translates to:
  /// **'No'**
  String get no;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get loading;

  /// No description provided for @noDataFound.
  ///
  /// In en, this message translates to:
  /// **'No data found'**
  String get noDataFound;

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try Again'**
  String get tryAgain;

  /// No description provided for @todayAttendance.
  ///
  /// In en, this message translates to:
  /// **'Today\'s Attendance'**
  String get todayAttendance;

  /// No description provided for @weeklyStats.
  ///
  /// In en, this message translates to:
  /// **'Weekly Stats'**
  String get weeklyStats;

  /// No description provided for @monthlyRevenue.
  ///
  /// In en, this message translates to:
  /// **'Monthly Revenue'**
  String get monthlyRevenue;

  /// No description provided for @activeCoupons.
  ///
  /// In en, this message translates to:
  /// **'Active Coupons'**
  String get activeCoupons;

  /// No description provided for @addNewMember.
  ///
  /// In en, this message translates to:
  /// **'Add New Member'**
  String get addNewMember;

  /// No description provided for @editMember.
  ///
  /// In en, this message translates to:
  /// **'Edit Member'**
  String get editMember;

  /// No description provided for @deleteMember.
  ///
  /// In en, this message translates to:
  /// **'Delete Member'**
  String get deleteMember;

  /// No description provided for @viewDetails.
  ///
  /// In en, this message translates to:
  /// **'View Details'**
  String get viewDetails;

  /// No description provided for @trainerCertifications.
  ///
  /// In en, this message translates to:
  /// **'Trainer Certifications'**
  String get trainerCertifications;

  /// No description provided for @specialization.
  ///
  /// In en, this message translates to:
  /// **'Specialization'**
  String get specialization;

  /// No description provided for @experience.
  ///
  /// In en, this message translates to:
  /// **'Experience'**
  String get experience;

  /// No description provided for @rating.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get rating;

  /// No description provided for @scanQRCode.
  ///
  /// In en, this message translates to:
  /// **'Scan QR Code'**
  String get scanQRCode;

  /// No description provided for @manualEntry.
  ///
  /// In en, this message translates to:
  /// **'Manual Entry'**
  String get manualEntry;

  /// No description provided for @markAttendance.
  ///
  /// In en, this message translates to:
  /// **'Mark Attendance'**
  String get markAttendance;

  /// No description provided for @receivedPayments.
  ///
  /// In en, this message translates to:
  /// **'Received Payments'**
  String get receivedPayments;

  /// No description provided for @pendingPayments.
  ///
  /// In en, this message translates to:
  /// **'Pending Payments'**
  String get pendingPayments;

  /// No description provided for @duePayments.
  ///
  /// In en, this message translates to:
  /// **'Due Payments'**
  String get duePayments;

  /// No description provided for @profitLoss.
  ///
  /// In en, this message translates to:
  /// **'Profit/Loss'**
  String get profitLoss;

  /// No description provided for @equipmentMaintenance.
  ///
  /// In en, this message translates to:
  /// **'Equipment Maintenance'**
  String get equipmentMaintenance;

  /// No description provided for @maintenanceDue.
  ///
  /// In en, this message translates to:
  /// **'Maintenance Due'**
  String get maintenanceDue;

  /// No description provided for @workingCondition.
  ///
  /// In en, this message translates to:
  /// **'Working Condition'**
  String get workingCondition;

  /// No description provided for @needsRepair.
  ///
  /// In en, this message translates to:
  /// **'Needs Repair'**
  String get needsRepair;

  /// No description provided for @createOffer.
  ///
  /// In en, this message translates to:
  /// **'Create Offer'**
  String get createOffer;

  /// No description provided for @generateCoupon.
  ///
  /// In en, this message translates to:
  /// **'Generate Coupon'**
  String get generateCoupon;

  /// No description provided for @activeCampaigns.
  ///
  /// In en, this message translates to:
  /// **'Active Campaigns'**
  String get activeCampaigns;

  /// No description provided for @offerTemplates.
  ///
  /// In en, this message translates to:
  /// **'Offer Templates'**
  String get offerTemplates;

  /// No description provided for @customerReviews.
  ///
  /// In en, this message translates to:
  /// **'Customer Reviews'**
  String get customerReviews;

  /// No description provided for @grievances.
  ///
  /// In en, this message translates to:
  /// **'Grievances'**
  String get grievances;

  /// No description provided for @communications.
  ///
  /// In en, this message translates to:
  /// **'Communications'**
  String get communications;

  /// No description provided for @replyToReview.
  ///
  /// In en, this message translates to:
  /// **'Reply to Review'**
  String get replyToReview;

  /// No description provided for @supportAndReviews.
  ///
  /// In en, this message translates to:
  /// **'Support & Reviews'**
  String get supportAndReviews;

  /// No description provided for @autoRefreshEnabled.
  ///
  /// In en, this message translates to:
  /// **'Auto-refresh enabled'**
  String get autoRefreshEnabled;

  /// No description provided for @autoRefreshDisabled.
  ///
  /// In en, this message translates to:
  /// **'Auto-refresh disabled'**
  String get autoRefreshDisabled;

  /// No description provided for @refreshNow.
  ///
  /// In en, this message translates to:
  /// **'Refresh now'**
  String get refreshNow;

  /// No description provided for @reviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get reviews;

  /// No description provided for @chats.
  ///
  /// In en, this message translates to:
  /// **'Chats'**
  String get chats;

  /// No description provided for @unread.
  ///
  /// In en, this message translates to:
  /// **'unread'**
  String get unread;

  /// No description provided for @pending.
  ///
  /// In en, this message translates to:
  /// **'pending'**
  String get pending;

  /// No description provided for @open.
  ///
  /// In en, this message translates to:
  /// **'open'**
  String get open;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @gymConfiguration.
  ///
  /// In en, this message translates to:
  /// **'Gym Configuration'**
  String get gymConfiguration;

  /// No description provided for @adminManagement.
  ///
  /// In en, this message translates to:
  /// **'Admin Management'**
  String get adminManagement;

  /// No description provided for @securitySettings.
  ///
  /// In en, this message translates to:
  /// **'Security Settings'**
  String get securitySettings;

  /// No description provided for @security.
  ///
  /// In en, this message translates to:
  /// **'Security'**
  String get security;

  /// No description provided for @backupData.
  ///
  /// In en, this message translates to:
  /// **'Backup Data'**
  String get backupData;

  /// No description provided for @restoreData.
  ///
  /// In en, this message translates to:
  /// **'Restore Data'**
  String get restoreData;

  /// No description provided for @sessionTimer.
  ///
  /// In en, this message translates to:
  /// **'Session Timer'**
  String get sessionTimer;

  /// No description provided for @sessionActive.
  ///
  /// In en, this message translates to:
  /// **'Session Active'**
  String get sessionActive;

  /// No description provided for @sessionExpiry.
  ///
  /// In en, this message translates to:
  /// **'Session Expiry'**
  String get sessionExpiry;

  /// No description provided for @timeRemaining.
  ///
  /// In en, this message translates to:
  /// **'Time Remaining'**
  String get timeRemaining;

  /// No description provided for @sessionWillExpireSoon.
  ///
  /// In en, this message translates to:
  /// **'Your session will expire soon'**
  String get sessionWillExpireSoon;

  /// No description provided for @sessionExpiredTitle.
  ///
  /// In en, this message translates to:
  /// **'Session Expired'**
  String get sessionExpiredTitle;

  /// No description provided for @sessionExpiredMessage.
  ///
  /// In en, this message translates to:
  /// **'Your session has expired. Please login again.'**
  String get sessionExpiredMessage;

  /// No description provided for @sessionWarningTitle.
  ///
  /// In en, this message translates to:
  /// **'Session Expiring Soon'**
  String get sessionWarningTitle;

  /// No description provided for @sessionWarningMessage.
  ///
  /// In en, this message translates to:
  /// **'Your session will expire in {time}. Do you want to extend the session?'**
  String sessionWarningMessage(Object time);

  /// No description provided for @extendSession.
  ///
  /// In en, this message translates to:
  /// **'Extend Session'**
  String get extendSession;

  /// No description provided for @continueWorking.
  ///
  /// In en, this message translates to:
  /// **'Continue Working'**
  String get continueWorking;

  /// No description provided for @autoLogoutEnabled.
  ///
  /// In en, this message translates to:
  /// **'Auto-logout enabled'**
  String get autoLogoutEnabled;

  /// No description provided for @sessionManagement.
  ///
  /// In en, this message translates to:
  /// **'Session Management'**
  String get sessionManagement;

  /// No description provided for @sessionInfo.
  ///
  /// In en, this message translates to:
  /// **'Session Information'**
  String get sessionInfo;

  /// No description provided for @loggedInSince.
  ///
  /// In en, this message translates to:
  /// **'Logged in since'**
  String get loggedInSince;

  /// No description provided for @autoSessionTimeout.
  ///
  /// In en, this message translates to:
  /// **'Auto Session Timeout'**
  String get autoSessionTimeout;

  /// No description provided for @autoSessionTimeoutDescription.
  ///
  /// In en, this message translates to:
  /// **'Set automatic logout time for security'**
  String get autoSessionTimeoutDescription;

  /// No description provided for @sessionTimeoutDuration.
  ///
  /// In en, this message translates to:
  /// **'Session Timeout Duration'**
  String get sessionTimeoutDuration;

  /// No description provided for @threeDays.
  ///
  /// In en, this message translates to:
  /// **'3 Days'**
  String get threeDays;

  /// No description provided for @sevenDays.
  ///
  /// In en, this message translates to:
  /// **'7 Days'**
  String get sevenDays;

  /// No description provided for @oneMonth.
  ///
  /// In en, this message translates to:
  /// **'1 Month (30 Days)'**
  String get oneMonth;

  /// No description provided for @currentTimeoutSetting.
  ///
  /// In en, this message translates to:
  /// **'Current: {duration}'**
  String currentTimeoutSetting(String duration);

  /// No description provided for @sessionTimeoutUpdated.
  ///
  /// In en, this message translates to:
  /// **'Session timeout updated successfully'**
  String get sessionTimeoutUpdated;

  /// No description provided for @failedToUpdateSessionTimeout.
  ///
  /// In en, this message translates to:
  /// **'Failed to update session timeout'**
  String get failedToUpdateSessionTimeout;

  /// No description provided for @selectSessionTimeout.
  ///
  /// In en, this message translates to:
  /// **'Select Session Timeout'**
  String get selectSessionTimeout;

  /// No description provided for @paymentManagement.
  ///
  /// In en, this message translates to:
  /// **'Payment Management'**
  String get paymentManagement;

  /// No description provided for @addPayment.
  ///
  /// In en, this message translates to:
  /// **'Add Payment'**
  String get addPayment;

  /// No description provided for @amountReceived.
  ///
  /// In en, this message translates to:
  /// **'Amount Received'**
  String get amountReceived;

  /// No description provided for @amountPaid.
  ///
  /// In en, this message translates to:
  /// **'Amount Paid'**
  String get amountPaid;

  /// No description provided for @paymentTrends.
  ///
  /// In en, this message translates to:
  /// **'Payment Trends'**
  String get paymentTrends;

  /// No description provided for @dues.
  ///
  /// In en, this message translates to:
  /// **'Dues'**
  String get dues;

  /// No description provided for @recentPayments.
  ///
  /// In en, this message translates to:
  /// **'Recent Payments'**
  String get recentPayments;

  /// No description provided for @paymentType.
  ///
  /// In en, this message translates to:
  /// **'Payment Type'**
  String get paymentType;

  /// No description provided for @paymentMethod.
  ///
  /// In en, this message translates to:
  /// **'Payment Method'**
  String get paymentMethod;

  /// No description provided for @amount.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get amount;

  /// No description provided for @memberName.
  ///
  /// In en, this message translates to:
  /// **'Member Name'**
  String get memberName;

  /// No description provided for @notes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notes;

  /// No description provided for @paidOn.
  ///
  /// In en, this message translates to:
  /// **'Paid On'**
  String get paidOn;

  /// No description provided for @dueOn.
  ///
  /// In en, this message translates to:
  /// **'Due On'**
  String get dueOn;

  /// No description provided for @markAsPaid.
  ///
  /// In en, this message translates to:
  /// **'Mark as Paid'**
  String get markAsPaid;

  /// No description provided for @totalEquipment.
  ///
  /// In en, this message translates to:
  /// **'Total Equipment'**
  String get totalEquipment;

  /// No description provided for @availableEquipment.
  ///
  /// In en, this message translates to:
  /// **'Available Equipment'**
  String get availableEquipment;

  /// No description provided for @maintenanceEquipment.
  ///
  /// In en, this message translates to:
  /// **'Maintenance'**
  String get maintenanceEquipment;

  /// No description provided for @outOfOrderEquipment.
  ///
  /// In en, this message translates to:
  /// **'Out of Order'**
  String get outOfOrderEquipment;

  /// No description provided for @addEquipment.
  ///
  /// In en, this message translates to:
  /// **'Add Equipment'**
  String get addEquipment;

  /// No description provided for @editEquipment.
  ///
  /// In en, this message translates to:
  /// **'Edit Equipment'**
  String get editEquipment;

  /// No description provided for @deleteEquipment.
  ///
  /// In en, this message translates to:
  /// **'Delete Equipment'**
  String get deleteEquipment;

  /// No description provided for @equipmentName.
  ///
  /// In en, this message translates to:
  /// **'Equipment Name'**
  String get equipmentName;

  /// No description provided for @brand.
  ///
  /// In en, this message translates to:
  /// **'Brand'**
  String get brand;

  /// No description provided for @model.
  ///
  /// In en, this message translates to:
  /// **'Model'**
  String get model;

  /// No description provided for @category.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get category;

  /// No description provided for @quantity.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get quantity;

  /// No description provided for @status.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get status;

  /// No description provided for @purchaseDate.
  ///
  /// In en, this message translates to:
  /// **'Purchase Date'**
  String get purchaseDate;

  /// No description provided for @price.
  ///
  /// In en, this message translates to:
  /// **'Price'**
  String get price;

  /// No description provided for @warranty.
  ///
  /// In en, this message translates to:
  /// **'Warranty'**
  String get warranty;

  /// No description provided for @location.
  ///
  /// In en, this message translates to:
  /// **'Location'**
  String get location;

  /// No description provided for @specifications.
  ///
  /// In en, this message translates to:
  /// **'Specifications'**
  String get specifications;

  /// No description provided for @photos.
  ///
  /// In en, this message translates to:
  /// **'Photos'**
  String get photos;

  /// No description provided for @addPhotos.
  ///
  /// In en, this message translates to:
  /// **'Add Photos'**
  String get addPhotos;

  /// No description provided for @searchEquipment.
  ///
  /// In en, this message translates to:
  /// **'Search equipment...'**
  String get searchEquipment;

  /// No description provided for @allCategories.
  ///
  /// In en, this message translates to:
  /// **'All Categories'**
  String get allCategories;

  /// No description provided for @allStatuses.
  ///
  /// In en, this message translates to:
  /// **'All Statuses'**
  String get allStatuses;

  /// No description provided for @sortBy.
  ///
  /// In en, this message translates to:
  /// **'Sort By'**
  String get sortBy;

  /// No description provided for @name.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get name;

  /// No description provided for @months.
  ///
  /// In en, this message translates to:
  /// **'months'**
  String get months;

  /// No description provided for @noEquipmentFound.
  ///
  /// In en, this message translates to:
  /// **'No Equipment Found'**
  String get noEquipmentFound;

  /// No description provided for @noEquipmentFoundDescription.
  ///
  /// In en, this message translates to:
  /// **'Start by adding your first piece of equipment to track and manage your gym inventory.'**
  String get noEquipmentFoundDescription;

  /// No description provided for @confirmDelete.
  ///
  /// In en, this message translates to:
  /// **'Confirm Delete'**
  String get confirmDelete;

  /// No description provided for @confirmDeleteEquipmentMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete {equipmentName}? This action cannot be undone.'**
  String confirmDeleteEquipmentMessage(String equipmentName);

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'hi'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
