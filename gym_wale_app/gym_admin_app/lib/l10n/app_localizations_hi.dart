// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get appTitle => 'जिम-वाले एडमिन';

  @override
  String get dashboard => 'डैशबोर्ड';

  @override
  String get members => 'सदस्य';

  @override
  String get activeMembers => 'सक्रिय सदस्य';

  @override
  String get expiredMembers => 'समाप्त सदस्य';

  @override
  String get noExpiredMembers => 'कोई समाप्त सदस्य नहीं मिला';

  @override
  String expiredMembersCount(int count) {
    return '$count समाप्त सदस्य';
  }

  @override
  String get trainers => 'प्रशिक्षक';

  @override
  String get attendance => 'उपस्थिति';

  @override
  String get payments => 'भुगतान';

  @override
  String get equipment => 'उपकरण';

  @override
  String get offers => 'ऑफर और कूपन';

  @override
  String get support => 'समर्थन और समीक्षा';

  @override
  String get settings => 'सेटिंग्स';

  @override
  String get logout => 'लॉगआउट';

  @override
  String get dashboardOverview => 'डैशबोर्ड अवलोकन';

  @override
  String get totalMembers => 'कुल सदस्य';

  @override
  String get totalRevenue => 'कुल राजस्व';

  @override
  String get pendingApprovals => 'लंबित अनुमोदन';

  @override
  String get quickActions => 'त्वरित कार्य';

  @override
  String get addMember => 'सदस्य जोड़ें';

  @override
  String get sendNotification => 'सूचना भेजें';

  @override
  String get generateReport => 'रिपोर्ट बनाएं';

  @override
  String get profile => 'प्रोफ़ाइल';

  @override
  String get gymProfile => 'जिम प्रोफ़ाइल';

  @override
  String get changePassword => 'पासवर्ड बदलें';

  @override
  String get notifications => 'सूचनाएं';

  @override
  String get viewMode => 'देखें मोड';

  @override
  String get editMode => 'संपादन मोड';

  @override
  String get enableEditMode => 'संपादन सक्षम करें';

  @override
  String get save => 'सहेजें';

  @override
  String get cancel => 'रद्द करें';

  @override
  String get basicInformation => 'बुनियादी जानकारी';

  @override
  String get gymName => 'जिम का नाम';

  @override
  String get ownerName => 'मालिक का नाम';

  @override
  String get email => 'ईमेल';

  @override
  String get phone => 'फोन';

  @override
  String get supportEmail => 'समर्थन ईमेल';

  @override
  String get supportPhone => 'समर्थन फोन';

  @override
  String get locationInformation => 'स्थान जानकारी';

  @override
  String get address => 'पता';

  @override
  String get city => 'शहर';

  @override
  String get state => 'राज्य';

  @override
  String get pincode => 'पिनकोड';

  @override
  String get landmark => 'स्थल चिह्न';

  @override
  String get operationalInformation => 'परिचालन जानकारी';

  @override
  String get openingTime => 'खुलने का समय';

  @override
  String get closingTime => 'बंद होने का समय';

  @override
  String get currentMembers => 'वर्तमान सदस्य';

  @override
  String get description => 'विवरण';

  @override
  String get currentPassword => 'वर्तमान पासवर्ड';

  @override
  String get newPassword => 'नया पासवर्ड';

  @override
  String get confirmPassword => 'पासवर्ड की पुष्टि करें';

  @override
  String get passwordStrength => 'पासवर्ड की ताकत';

  @override
  String get weak => 'कमजोर';

  @override
  String get medium => 'मध्यम';

  @override
  String get strong => 'मजबूत';

  @override
  String get theme => 'थीम';

  @override
  String get language => 'भाषा';

  @override
  String get lightMode => 'लाइट मोड';

  @override
  String get darkMode => 'डार्क मोड';

  @override
  String get systemDefault => 'सिस्टम डिफ़ॉल्ट';

  @override
  String get search => 'खोजें';

  @override
  String get filter => 'फ़िल्टर';

  @override
  String get export => 'निर्यात';

  @override
  String get import => 'आयात';

  @override
  String get refresh => 'ताज़ा करें';

  @override
  String get memberList => 'सदस्य सूची';

  @override
  String get trainerList => 'प्रशिक्षक सूची';

  @override
  String get attendanceRecords => 'उपस्थिति रिकॉर्ड';

  @override
  String get paymentHistory => 'भुगतान इतिहास';

  @override
  String get equipmentInventory => 'उपकरण सूची';

  @override
  String get activeStatus => 'सक्रिय';

  @override
  String get inactiveStatus => 'निष्क्रिय';

  @override
  String get pendingStatus => 'लंबित';

  @override
  String get expiredStatus => 'समाप्त';

  @override
  String get success => 'सफलता';

  @override
  String get error => 'त्रुटि';

  @override
  String get warning => 'चेतावनी';

  @override
  String get info => 'जानकारी';

  @override
  String get confirmAction => 'कार्रवाई की पुष्टि करें';

  @override
  String get areYouSure => 'क्या आप सुनिश्चित हैं?';

  @override
  String get yes => 'हाँ';

  @override
  String get no => 'नहीं';

  @override
  String get loading => 'लोड हो रहा है...';

  @override
  String get noDataFound => 'कोई डेटा नहीं मिला';

  @override
  String get tryAgain => 'पुनः प्रयास करें';

  @override
  String get todayAttendance => 'आज की उपस्थिति';

  @override
  String get weeklyStats => 'साप्ताहिक आंकड़े';

  @override
  String get monthlyRevenue => 'मासिक राजस्व';

  @override
  String get activeCoupons => 'सक्रिय कूपन';

  @override
  String get addNewMember => 'नया सदस्य जोड़ें';

  @override
  String get editMember => 'सदस्य संपादित करें';

  @override
  String get deleteMember => 'सदस्य हटाएं';

  @override
  String get viewDetails => 'विवरण देखें';

  @override
  String get trainerCertifications => 'प्रशिक्षक प्रमाणपत्र';

  @override
  String get specialization => 'विशेषज्ञता';

  @override
  String get experience => 'अनुभव';

  @override
  String get rating => 'रेटिंग';

  @override
  String get scanQRCode => 'QR कोड स्कैन करें';

  @override
  String get manualEntry => 'मैनुअल प्रविष्टि';

  @override
  String get markAttendance => 'उपस्थिति चिह्नित करें';

  @override
  String get receivedPayments => 'प्राप्त भुगतान';

  @override
  String get pendingPayments => 'लंबित भुगतान';

  @override
  String get duePayments => 'बकाया भुगतान';

  @override
  String get profitLoss => 'लाभ/हानि';

  @override
  String get equipmentMaintenance => 'उपकरण रखरखाव';

  @override
  String get maintenanceDue => 'रखरखाव बकाया';

  @override
  String get workingCondition => 'कार्य स्थिति';

  @override
  String get needsRepair => 'मरम्मत की आवश्यकता';

  @override
  String get createOffer => 'ऑफर बनाएं';

  @override
  String get generateCoupon => 'कूपन बनाएं';

  @override
  String get activeCampaigns => 'सक्रिय अभियान';

  @override
  String get offerTemplates => 'ऑफर टेम्पलेट';

  @override
  String get customerReviews => 'ग्राहक समीक्षा';

  @override
  String get grievances => 'शिकायतें';

  @override
  String get communications => 'संचार';

  @override
  String get replyToReview => 'समीक्षा का जवाब दें';

  @override
  String get supportAndReviews => 'सहायता और समीक्षा';

  @override
  String get autoRefreshEnabled => 'स्वतः रीफ्रेश सक्षम';

  @override
  String get autoRefreshDisabled => 'स्वतः रीफ्रेश अक्षम';

  @override
  String get refreshNow => 'अभी रीफ्रेश करें';

  @override
  String get reviews => 'समीक्षा';

  @override
  String get chats => 'चैट';

  @override
  String get unread => 'अपठित';

  @override
  String get pending => 'लंबित';

  @override
  String get open => 'खुला';

  @override
  String get retry => 'पुनः प्रयास करें';

  @override
  String get gymConfiguration => 'जिम कॉन्फ़िगरेशन';

  @override
  String get adminManagement => 'व्यवस्थापक प्रबंधन';

  @override
  String get securitySettings => 'सुरक्षा सेटिंग्स';

  @override
  String get security => 'सुरक्षा';

  @override
  String get backupData => 'डेटा बैकअप';

  @override
  String get restoreData => 'डेटा पुनर्स्थापित करें';

  @override
  String get sessionTimer => 'सत्र टाइमर';

  @override
  String get sessionActive => 'सत्र सक्रिय';

  @override
  String get sessionExpiry => 'सत्र समाप्ति';

  @override
  String get timeRemaining => 'शेष समय';

  @override
  String get sessionWillExpireSoon => 'आपका सत्र जल्द ही समाप्त हो जाएगा';

  @override
  String get sessionExpiredTitle => 'सत्र समाप्त हो गया';

  @override
  String get sessionExpiredMessage =>
      'आपका सत्र समाप्त हो गया है। कृपया फिर से लॉगिन करें।';

  @override
  String get sessionWarningTitle => 'सत्र जल्द समाप्त हो रहा है';

  @override
  String sessionWarningMessage(Object time) {
    return 'आपका सत्र $time में समाप्त हो जाएगा। क्या आप सत्र बढ़ाना चाहते हैं?';
  }

  @override
  String get extendSession => 'सत्र बढ़ाएं';

  @override
  String get continueWorking => 'काम जारी रखें';

  @override
  String get autoLogoutEnabled => 'स्वतः लॉगआउट सक्षम';

  @override
  String get sessionManagement => 'सत्र प्रबंधन';

  @override
  String get sessionInfo => 'सत्र जानकारी';

  @override
  String get loggedInSince => 'लॉग इन समय';

  @override
  String get autoSessionTimeout => 'स्वतः सत्र समय समाप्ति';

  @override
  String get autoSessionTimeoutDescription =>
      'सुरक्षा के लिए स्वचालित लॉगआउट समय सेट करें';

  @override
  String get sessionTimeoutDuration => 'सत्र समय समाप्ति अवधि';

  @override
  String get threeDays => '3 दिन';

  @override
  String get sevenDays => '7 दिन';

  @override
  String get oneMonth => '1 महीना (30 दिन)';

  @override
  String currentTimeoutSetting(String duration) {
    return 'वर्तमान: $duration';
  }

  @override
  String get sessionTimeoutUpdated =>
      'सत्र समय समाप्ति सफलतापूर्वक अपडेट की गई';

  @override
  String get failedToUpdateSessionTimeout =>
      'सत्र समय समाप्ति अपडेट करने में विफल';

  @override
  String get selectSessionTimeout => 'सत्र समय समाप्ति चुनें';

  @override
  String get totalEquipment => 'कुल उपकरण';

  @override
  String get availableEquipment => 'उपलब्ध उपकरण';

  @override
  String get maintenanceEquipment => 'रखरखाव में';

  @override
  String get outOfOrderEquipment => 'खराब';

  @override
  String get addEquipment => 'उपकरण जोड़ें';

  @override
  String get editEquipment => 'उपकरण संपादित करें';

  @override
  String get deleteEquipment => 'उपकरण हटाएं';

  @override
  String get equipmentName => 'उपकरण का नाम';

  @override
  String get brand => 'ब्रांड';

  @override
  String get model => 'मॉडल';

  @override
  String get category => 'श्रेणी';

  @override
  String get quantity => 'मात्रा';

  @override
  String get status => 'स्थिति';

  @override
  String get purchaseDate => 'खरीद तिथि';

  @override
  String get price => 'कीमत';

  @override
  String get warranty => 'वारंटी';

  @override
  String get location => 'स्थान';

  @override
  String get specifications => 'विशेषताएं';

  @override
  String get photos => 'फ़ोटो';

  @override
  String get addPhotos => 'फ़ोटो जोड़ें';

  @override
  String get searchEquipment => 'उपकरण खोजें...';

  @override
  String get allCategories => 'सभी श्रेणियां';

  @override
  String get allStatuses => 'सभी स्थितियां';

  @override
  String get sortBy => 'क्रमबद्ध करें';

  @override
  String get name => 'नाम';

  @override
  String get months => 'महीने';

  @override
  String get noEquipmentFound => 'कोई उपकरण नहीं मिला';

  @override
  String get noEquipmentFoundDescription =>
      'अपने जिम इन्वेंट्री को ट्रैक और प्रबंधित करने के लिए पहला उपकरण जोड़ें।';

  @override
  String get confirmDelete => 'हटाने की पुष्टि करें';

  @override
  String confirmDeleteEquipmentMessage(String equipmentName) {
    return 'क्या आप वाकई $equipmentName को हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।';
  }

  @override
  String get delete => 'हटाएं';
}
