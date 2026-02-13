// Simple i18n module for Gym Admin
(function(){
  const STORAGE_KEY = 'gw_lang';
  const DEFAULT_LANG = 'en';

  const translations = {
    en: {
      'settings.language.title': 'Language & Region',
      'settings.language.subtitle': 'Choose your preferred language for the dashboard',
      'settings.language.label': 'Language',
      'settings.language.desc': 'Switch between English and Hindi. English is the default.',

      // Sidebar
      'sidebar.dashboard': 'Dashboard',
      'sidebar.members': 'Members',
      'sidebar.trainers': 'Trainers',
      'sidebar.attendance': 'Attendance',
      'sidebar.payments': 'Payments',
      'sidebar.equipment': 'Equipment',
      'sidebar.offers': 'Offers & Coupons',
      'sidebar.support': 'Support & Reviews',
      'sidebar.settings': 'Settings',

      // Headers
      'header.dashboard.title': 'Dashboard Overview',
      'quick.actions.title': 'Quick Actions',
      'quick.actions.customize': 'Customize',
      'quick.actions.addMember': 'Add Member',
      'quick.actions.recordPayment': 'Record Payment',
      'quick.actions.addTrainer': 'Add Trainer',
      'quick.actions.addEquipment': 'Add Equipment',
      'quick.actions.generateQR': 'Generate QR Code',
      'quick.actions.enrollBiometric': 'Biometric Enrollment',
      'quick.actions.deviceSetup': 'Setup Devices',
      'quick.actions.sendNotification': 'Send Notification',

      // Notifications
      'notifications.all': 'All Notifications',
      'notifications.markAllRead': 'Mark All Read',
      'notifications.none': 'No new notifications',
      'notifications.viewAll': 'View All',

      // Filters
      'filter.all': 'All',
      'filter.system': 'System',
      'filter.admin': 'Admin',
      'filter.grievances': 'Grievances',
      'filter.membership': 'Membership',
      'filter.unread': 'Unread',

      // Activities
      'activities.offered': 'Activities Offered',
      'activities.add': 'Add Activities',

      // Photos
      'photos.uploaded': 'Previously Uploaded Gym Photos',
      'photos.upload': 'Upload Photo',

      // Membership
      'membership.plans': 'Membership Plans',
      'membership.editPlans': 'Edit Plans',
      'membership.edit': 'Edit Membership Plans',

      // Stats
      'stat.members': 'Members',
      'stat.totalPayments': 'Total Payments',
      'stat.attendance': 'Overall Attendance',
      'stat.trainers': 'Active Trainers',

      // Loading states
      'loading.text': 'Loading...',
      'calculating.text': 'Calculating...',

      // Activities Messages
      'activities.failed': 'Failed to load activities.',
      'activities.none': 'No activities added yet.',
      'activities.invalid': 'No valid activities found.',

      // Trainers Messages
      'trainers.pending.none': 'No pending trainers found.',
      'trainers.approved.none': 'No approved trainers found.',
      'trainers.rejected.none': 'No rejected trainers found.',

      // Total/Price
      'total.text': 'Total:',

      // Form buttons
      'saveAll': 'Save All',

      // Search/Input
      'search.actions': 'Search actions...',

      // Payment
      'payment.management': 'Payment Management',

      // Offers & Coupons
      'offers.management': 'Offers & Coupons Management',
      'offers.create.custom': 'Create Custom Offer',
      'offers.view.coupons': 'Active Coupons',
      'offers.active.count': 'Active Offers',
      'offers.revenue.generated': 'Revenue Generated',
      'offers.this.month': 'This Month',
      'offers.total.revenue': 'Total Revenue',
      'offers.active.coupons': 'Active Coupons',
      'offers.total.claims': 'Total Claims',
      'offers.conversion.rate': 'Conversion Rate',
      'offers.templates': 'Offer Templates',
      'offers.active.campaigns': 'Active Campaigns',
      'offers.coupon.management': 'Coupon Management',
      'offers.analytics': 'Analytics',
      'offers.quick.templates': 'Quick Offer Templates',
      'offers.templates.description': 'Choose from pre-designed templates or create custom offers for your gym members',
      'offers.loading.templates': 'Loading offer templates...',
      'offers.active.campaigns.title': 'Active Campaigns',
      'offers.campaigns.description': 'Monitor and manage your currently running promotional campaigns',
      'offers.filter.status': 'Status:',
      'offers.filter.all': 'All Campaigns',
      'offers.filter.active': 'Active',
      'offers.filter.paused': 'Paused',
      'offers.filter.expired': 'Expired',
      'offers.no.campaigns': 'No Active Campaigns',
      'offers.campaigns.empty.message': 'Create your first promotional campaign to start attracting new members',
      'offers.create.campaign': 'Create Campaign',
      'offers.coupon.management.title': 'Coupon Management',
      'offers.generate.coupon': 'Generate Coupon',
      'offers.export.coupons': 'Export',
      'offers.search.coupons': 'Search Coupons:',
      'offers.search.placeholder': 'Search by code, type, or description...',
      'offers.coupon.type': 'Type:',
      'offers.filter.all.types': 'All Types',
      'offers.filter.percentage': 'Percentage',
      'offers.filter.fixed': 'Fixed Amount',
      'offers.coupon.status': 'Status:',
      'offers.filter.all.status': 'All Status',
      'offers.status.active': 'Active',
      'offers.status.expired': 'Expired',
      'offers.status.disabled': 'Disabled',
      'offers.table.code': 'Coupon Code',
      'offers.table.type': 'Type',
      'offers.table.discount': 'Discount',
      'offers.table.usage': 'Usage',
      'offers.table.expiry': 'Expiry Date',
      'offers.table.status': 'Status',
      'offers.table.actions': 'Actions',
      'offers.no.coupons': 'No Coupons Found',
      'offers.coupons.empty.message': 'Create your first coupon to offer discounts to your members',
      'offers.create.first.coupon': 'Create First Coupon',
      'offers.analytics.title': 'Offers & Coupons Analytics',
      'offers.export.analytics': 'Export Report',
      'offers.last.7.days': 'Last 7 Days',
      'offers.last.30.days': 'Last 30 Days',
      'offers.last.90.days': 'Last 90 Days',
      'offers.last.year': 'Last Year',
      'offers.usage.trends': 'Coupon Usage Trends',
      'offers.discount.distribution': 'Discount Distribution',
      'offers.chart.loading': 'Loading chart data...',
      'offers.top.performing': 'Top Performing Offers',
      'offers.recent.activity': 'Recent Activity',

      // Dashboard Cards
      'new.members': 'New Members',
      'trial.bookings': 'Trial Bookings',
      'attendance.trend': 'Attendance Trend',
      'recent.activity': 'Recent Activity',
      'equipment.gallery': 'Equipment Gallery'
    },
    hi: {
      'settings.language.title': 'भाषा और क्षेत्र',
      'settings.language.subtitle': 'डैशबोर्ड के लिए अपनी पसंदीदा भाषा चुनें',
      'settings.language.label': 'भाषा',
      'settings.language.desc': 'अंग्रेज़ी और हिंदी के बीच स्विच करें। डिफ़ॉल्ट अंग्रेज़ी है।',

      // Sidebar
      'sidebar.dashboard': 'डैशबोर्ड',
      'sidebar.members': 'सदस्य',
      'sidebar.trainers': 'ट्रेनर्स',
      'sidebar.attendance': 'उपस्थिति',
      'sidebar.payments': 'भुगतान',
      'sidebar.equipment': 'उपकरण',
      'sidebar.support': 'समर्थन और समीक्षा',
      'sidebar.settings': 'सेटिंग्स',

      // Headers
      'header.dashboard.title': 'डैशबोर्ड अवलोकन',
      'quick.actions.title': 'क्विक एक्शन',
      'quick.actions.customize': 'कस्टमाइज़',
      'quick.actions.addMember': 'सदस्य जोड़ें',
      'quick.actions.recordPayment': 'भुगतान दर्ज करें',
      'quick.actions.addTrainer': 'ट्रेनर जोड़ें',
      'quick.actions.addEquipment': 'उपकरण जोड़ें',
      'quick.actions.generateQR': 'क्यूआर कोड बनाएं',
      'quick.actions.enrollBiometric': 'बायोमेट्रिक एनरोलमेंट',
      'quick.actions.deviceSetup': 'डिवाइस सेटअप',
      'quick.actions.sendNotification': 'सूचना भेजें',

      // Notifications
      'notifications.all': 'सभी सूचनाएँ',
      'notifications.markAllRead': 'सभी पढ़ा चिह्नित करें',
      'notifications.none': 'कोई नई सूचनाएँ नहीं',
      'notifications.viewAll': 'सभी देखें',

      // Filters
      'filter.all': 'सभी',
      'filter.system': 'सिस्टम',
      'filter.admin': 'एडमिन',
      'filter.grievances': 'शिकायतें',
      'filter.membership': 'सदस्यता',
      'filter.unread': 'अपठित',

      // Activities
      'activities.offered': 'प्रस्तावित गतिविधियाँ',
      'activities.add': 'गतिविधियाँ जोड़ें',

      // Photos
      'photos.uploaded': 'पहले अपलोड की गई जिम फोटो',
      'photos.upload': 'फोटो अपलोड करें',

      // Membership
      'membership.plans': 'सदस्यता प्लान',
      'membership.editPlans': 'प्लान संपादित करें',
      'membership.edit': 'सदस्यता प्लान संपादित करें',

      // Stats
      'stat.members': 'सदस्य',
      'stat.totalPayments': 'कुल भुगतान',
      'stat.attendance': 'कुल उपस्थिति',
      'stat.trainers': 'सक्रिय ट्रेनर्स',

      // Loading states
      'loading.text': 'लोड हो रहा है...',
      'calculating.text': 'गणना हो रही है...',
      // Activities Messages
      'activities.failed': 'गतिविधियाँ लोड करने में विफल।',
      'activities.none': 'अभी तक कोई गतिविधियाँ नहीं जोड़ी गई हैं।',
      'activities.invalid': 'कोई वैध गतिविधियाँ नहीं मिलीं।',

      // Trainers Messages
      'trainers.pending.none': 'कोई लंबित ट्रेनर नहीं मिला।',
      'trainers.approved.none': 'कोई स्वीकृत ट्रेनर नहीं मिला।',
      'trainers.rejected.none': 'कोई अस्वीकृत ट्रेनर नहीं मिला।',

      // Total/Price
      'total.text': 'कुल:',

      // Form buttons
      'saveAll': 'सभी सहेजें',

      // Search/Input
      'search.actions': 'क्रियाएं खोजें...',

      // Payment
      'payment.management': 'भुगतान प्रबंधन',

      // Offers & Coupons
      'offers.management': 'ऑफर और कूपन प्रबंधन',
      'offers.create.custom': 'कस्टम ऑफर बनाएं',
      'offers.view.coupons': 'सक्रिय कूपन',
      'offers.active.count': 'सक्रिय ऑफर',
      'offers.revenue.generated': 'उत्पन्न आयकर',
      'offers.this.month': 'इस महीने',
      'offers.total.revenue': 'कुल आयकर',
      'offers.active.coupons': 'सक्रिय कूपन',
      'offers.total.claims': 'कुल दावे',
      'offers.conversion.rate': 'रूपांतरण दर',
      'offers.templates': 'ऑफर टेम्प्लेट',
      'offers.active.campaigns': 'सक्रिय अभियान',
      'offers.coupon.management': 'कूपन प्रबंधन',
      'offers.analytics': 'विश्लेषिकी',
      'offers.quick.templates': 'त्वरित ऑफर टेम्प्लेट',
      'offers.templates.description': 'पूर्व-डिज़ाइन किए गए टेम्प्लेट चुनें या अपने जिम सदस्यों के लिए कस्टम ऑफर बनाएं',
      'offers.loading.templates': 'ऑफर टेम्प्लेट लोड हो रहे हैं...',
      'offers.active.campaigns.title': 'सक्रिय अभियान',
      'offers.campaigns.description': 'अपने वर्तमान में चल रहे प्रचार अभियानों की निगरानी और प्रबंधन करें',
      'offers.filter.status': 'स्थिति:',
      'offers.filter.all': 'सभी अभियान',
      'offers.filter.active': 'सक्रिय',
      'offers.filter.paused': 'रोका गया',
      'offers.filter.expired': 'समाप्त',
      'offers.no.campaigns': 'कोई सक्रिय अभियान नहीं',
      'offers.campaigns.empty.message': 'नए सदस्यों को आकर्षित करने के लिए अपना पहला प्रचार अभियान बनाएं',
      'offers.create.campaign': 'अभियान बनाएं',
      'offers.coupon.management.title': 'कूपन प्रबंधन',
      'offers.generate.coupon': 'कूपन बनाएं',
      'offers.export.coupons': 'निर्यात',
      'offers.search.coupons': 'कूपन खोजें:',
      'offers.search.placeholder': 'कोड, प्रकार या विवरण से खोजें...',
      'offers.coupon.type': 'प्रकार:',
      'offers.filter.all.types': 'सभी प्रकार',
      'offers.filter.percentage': 'प्रतिशत',
      'offers.filter.fixed': 'निश्चित राशि',
      'offers.coupon.status': 'स्थिति:',
      'offers.filter.all.status': 'सभी स्थिति',
      'offers.status.active': 'सक्रिय',
      'offers.status.expired': 'समाप्त',
      'offers.status.disabled': 'निष्क्रिय',
      'offers.table.code': 'कूपन कोड',
      'offers.table.type': 'प्रकार',
      'offers.table.discount': 'छूट',
      'offers.table.usage': 'उपयोग',
      'offers.table.expiry': 'समाप्ति तिथि',
      'offers.table.status': 'स्थिति',
      'offers.table.actions': 'क्रियाएं',
      'offers.no.coupons': 'कोई कूपन नहीं मिला',
      'offers.coupons.empty.message': 'अपने सदस्यों को छूट देने के लिए अपना पहला कूपन बनाएं',
      'offers.create.first.coupon': 'पहला कूपन बनाएं',
      'offers.analytics.title': 'ऑफर और कूपन विश्लेषिकी',
      'offers.export.analytics': 'रिपोर्ट निर्यात करें',
      'offers.last.7.days': 'पिछले 7 दिन',
      'offers.last.30.days': 'पिछले 30 दिन',
      'offers.last.90.days': 'पिछले 90 दिन',
      'offers.last.year': 'पिछला साल',
      'offers.usage.trends': 'कूपन उपयोग रुझान',
      'offers.discount.distribution': 'छूट वितरण',
      'offers.chart.loading': 'चार्ट डेटा लोड हो रहा है...',
      'offers.top.performing': 'सर्वश्रेष्ठ प्रदर्शन करने वाले ऑफर',
      'offers.recent.activity': 'हाल की गतिविधि',

      // Dashboard Cards
      'new.members': 'नए सदस्य',
      'trial.bookings': 'ट्रायल बुकिंग',
      'attendance.trend': 'उपस्थिति रुझान',
      'recent.activity': 'हाल की गतिविधि',
      'equipment.gallery': 'उपकरण गैलरी'
    }
  };

  // Phrase-based translation for broad coverage without tagging every element
  const phraseMap = {
    en: {
      // Generic UI
      'Settings': 'Settings',
      'Customize': 'Customize',
      'Cancel': 'Cancel',
      'Save': 'Save',
      'Save All': 'Save All',
      'View All': 'View All',
      'Export': 'Export',
      'Refresh': 'Refresh',
      'Upload Photo': 'Upload Photo',
      'Edit Plans': 'Edit Plans',
      'Edit Membership Plans': 'Edit Membership Plans',
      // Sidebar + Headers
      'Dashboard': 'Dashboard',
      'Members': 'Members',
      'Trainers': 'Trainers',
      'Attendance': 'Attendance',
      'Payments': 'Payments',
      'Equipment': 'Equipment',
      'Offers & Coupons': 'Offers & Coupons',
      'Support & Reviews': 'Support & Reviews',
      'Dashboard Overview': 'Dashboard Overview',
      'Quick Actions': 'Quick Actions',
      'Activities Offered': 'Activities Offered',
      'Previously Uploaded Gym Photos': 'Previously Uploaded Gym Photos',
      'Membership Plans': 'Membership Plans',
      'New Members': 'New Members',
      'Trial Bookings': 'Trial Bookings',
      'Attendance Trend': 'Attendance Trend',
      'Payment Management': 'Payment Management',
      'Payment Trends': 'Payment Trends',
      'Dues': 'Dues',
      'Pending Payments': 'Pending Payments',
      'Recent Payments': 'Recent Payments',
      'Payment History': 'Payment History',
      // Stat/Panels
      'Total Payments': 'Total Payments',
      'Overall Attendance': 'Overall Attendance',
      'Active Trainers': 'Active Trainers',
      'Amount Received': 'Amount Received',
      'Amount Paid': 'Amount Paid',
      'Due Payments': 'Due Payments',
      'Profit/Loss': 'Profit/Loss',
      // Buttons (Quick actions)
      'Add Member': 'Add Member',
      'Record Payment': 'Record Payment',
      'Add Trainer': 'Add Trainer',
      'Add Equipment': 'Add Equipment',
      'Generate QR Code': 'Generate QR Code',
      'Biometric Enrollment': 'Biometric Enrollment',
      'Setup Devices': 'Setup Devices',
      'Send Notification': 'Send Notification',
      // Attendance Stats Modal
      'Attendance Statistics': 'Attendance Statistics',
      "Today's Attendance Summary": "Today's Attendance Summary",
      'Members Present': 'Members Present',
      'Trainers Present': 'Trainers Present',
      'Monthly Attendance Trend': 'Monthly Attendance Trend',
      'Detailed Statistics': 'Detailed Statistics',
      'Total Members:': 'Total Members:',
      'Present Today:': 'Present Today:',
      'Absent Today:': 'Absent Today:',
      'Attendance Rate:': 'Attendance Rate:',
      'Total Trainers:': 'Total Trainers:',
      // Payment content
      'All Status': 'All Status',
      'All': 'All',
      'Monthly Recurring': 'Monthly Recurring',
      'Pending': 'Pending',
      'Overdue': 'Overdue',
      'Completed': 'Completed',
      // Common labels
      'Month:': 'Month:',
      'Year:': 'Year:',
      'Month': 'Month',
      'Year': 'Year',
      // Month names
      'Jan': 'Jan','Feb': 'Feb','Mar': 'Mar','Apr': 'Apr','May': 'May','Jun': 'Jun','Jul': 'Jul','Aug': 'Aug','Sep': 'Sep','Oct': 'Oct','Nov': 'Nov','Dec': 'Dec',
      'January': 'January','February': 'February','March': 'March','April': 'April','June': 'June','July': 'July','August': 'August','September': 'September','October': 'October','November': 'November','December': 'December',
      // Common actions, modals, forms
      'Close': 'Close','Apply': 'Apply','Reset': 'Reset','Delete': 'Delete','Remove': 'Remove','Update': 'Update','Create': 'Create','Submit': 'Submit',
      'Next': 'Next','Previous': 'Previous','Back': 'Back','Continue': 'Continue','Search': 'Search','Filter': 'Filter','Clear': 'Clear','Download': 'Download','Print': 'Print',
      'Yes': 'Yes','No': 'No','Confirm': 'Confirm','Are you sure?': 'Are you sure?',
      // Common fields
      'Description': 'Description','Name': 'Name','Full Name': 'Full Name','Email': 'Email','Email Address': 'Email Address','Phone': 'Phone','Phone Number': 'Phone Number','Phone No.': 'Phone No.',
      'Mobile': 'Mobile','Address': 'Address','City': 'City','State': 'State','Country': 'Country','Pincode': 'Pincode','Postal Code': 'Postal Code',
      'Date': 'Date','Time': 'Time','Price': 'Price','Amount': 'Amount','Status': 'Status','Action': 'Action','Actions': 'Actions','Notes': 'Notes','Comments': 'Comments','Category': 'Category',
      'Title': 'Title',
      // Notifications top bar
      'All Notifications': 'All Notifications','Mark All Read': 'Mark All Read','System': 'System','Admin': 'Admin','Grievances': 'Grievances','Membership': 'Membership','Unread': 'Unread','No new notifications': 'No new notifications',
      // Dashboard misc
      'Loading new members...': 'Loading new members...','Calculating...': 'Calculating...','Recent Activity': 'Recent Activity','Equipment Gallery': 'Equipment Gallery',
      // Payment Tab
        'Add Payment': 'Add Payment','Amount Received Breakdown': 'Amount Received Breakdown','Amount Paid Breakdown': 'Amount Paid Breakdown',
        'Pending Payments Details': 'Pending Payments Details','Due Payments Details': 'Due Payments Details','Profit/Loss Analysis': 'Profit/Loss Analysis','Loading payments...': 'Loading payments...',
        'Loading pending payments...': 'Loading pending payments...','View Full Payment History': 'View Full Payment History',
      // Members & Tables
      'All Members': 'All Members','Search by Name, Email, Phone, Membership ID...': 'Search by Name, Email, Phone, Membership ID...','Expiring in 3 Days': 'Expiring in 3 Days','Expiring in 1 Day': 'Expiring in 1 Day',
      'Profile': 'Profile','Membership ID': 'Membership ID','Age': 'Age','Gender': 'Gender','Join Date': 'Join Date','Valid Until': 'Valid Until',
      // Trainer Management
      'Trainer Management': 'Trainer Management','Approved': 'Approved','Rejected': 'Rejected','Approve Selected': 'Approve Selected','Reject Selected': 'Reject Selected','No trainers found': 'No trainers found',
      // Equipment
      'Equipment Management': 'Equipment Management','Bulk Import': 'Bulk Import','Total Equipment': 'Total Equipment','Available': 'Available','Under Maintenance': 'Under Maintenance','Out of Order': 'Out of Order',
      // Support & Reviews
      'Support & Communications Center': 'Support & Communications Center','Raise Grievance': 'Raise Grievance','Notifications': 'Notifications','Reviews': 'Reviews','Communications': 'Communications',
      'Notification Center': 'Notification Center','All Types': 'All Types','Loading notifications...': 'Loading notifications...',
      'Review Management': 'Review Management','All Ratings': 'All Ratings','All Reviews': 'All Reviews','Pending Reply': 'Pending Reply','Loading reviews...': 'Loading reviews...',
      'Grievance Management': 'Grievance Management','All Priority': 'All Priority','New Grievance': 'New Grievance','Loading grievances...': 'Loading grievances...',
      'Member Communications': 'Member Communications','All Conversations': 'All Conversations','Active': 'Active','Pending Response': 'Pending Response','Resolved': 'Resolved','Search members...': 'Search members...','Broadcast': 'Broadcast',
      'Select a conversation': 'Select a conversation','Choose a member conversation from the sidebar to start chatting': 'Choose a member conversation from the sidebar to start chatting'
    },
    hi: {
      // Generic UI
      'Settings': 'सेटिंग्स',
      'Customize': 'कस्टमाइज़',
      'Cancel': 'रद्द करें',
      'Save': 'सहेजें',
      'Save All': 'सभी सहेजें',
      'View All': 'सभी देखें',
      'Export': 'निर्यात',
      'Refresh': 'रिफ्रेश',
      'Upload Photo': 'फोटो अपलोड करें',
      'Edit Plans': 'प्लान संपादित करें',
      'Edit Membership Plans': 'सदस्यता प्लान संपादित करें',
      // Sidebar + Headers
      'Dashboard': 'डैशबोर्ड',
      'Members': 'सदस्य',
      'Trainers': 'ट्रेनर्स',
      'Attendance': 'उपस्थिति',
      'Payments': 'भुगतान',
      'Equipment': 'उपकरण',
      'Offers & Coupons': 'ऑफर और कूपन',
      'Support & Reviews': 'समर्थन और समीक्षा',
      'Dashboard Overview': 'डैशबोर्ड अवलोकन',
      'Quick Actions': 'क्विक एक्शन',
      'Activities Offered': 'प्रस्तावित गतिविधियाँ',
      'Previously Uploaded Gym Photos': 'पहले अपलोड की गई जिम फोटो',
      'Membership Plans': 'सदस्यता प्लान',
      'New Members': 'नए सदस्य',
      'Trial Bookings': 'ट्रायल बुकिंग',
      'Attendance Trend': 'उपस्थिति रुझान',
      'Payment Management': 'भुगतान प्रबंधन',
      'Payment Trends': 'भुगतान रुझान',
      'Dues': 'बकाया',
      'Pending Payments': 'लंबित भुगतान',
      'Recent Payments': 'हाल के भुगतान',
      'Payment History': 'भुगतान इतिहास',
      // Stat/Panels
      'Total Payments': 'कुल भुगतान',
      'Overall Attendance': 'कुल उपस्थिति',
      'Active Trainers': 'सक्रिय ट्रेनर्स',
      'Amount Received': 'प्राप्त राशि',
      'Amount Paid': 'भुगतान की गई राशि',
      'Due Payments': 'देय भुगतान',
      'Profit/Loss': 'लाभ/हानि',
      // Buttons (Quick actions)
      'Add Member': 'सदस्य जोड़ें',
      'Record Payment': 'भुगतान दर्ज करें',
      'Add Trainer': 'ट्रेनर जोड़ें',
      'Add Equipment': 'उपकरण जोड़ें',
      'Generate QR Code': 'क्यूआर कोड बनाएं',
      'Biometric Enrollment': 'बायोमेट्रिक एनरोलमेंट',
      'Setup Devices': 'डिवाइस सेटअप',
      'Send Notification': 'सूचना भेजें',
      // Attendance Stats Modal
      'Attendance Statistics': 'उपस्थिति सांख्यिकी',
      "Today's Attendance Summary": 'आज की उपस्थिति सारांश',
      'Members Present': 'उपस्थित सदस्य',
      'Trainers Present': 'उपस्थित ट्रेनर्स',
      'Monthly Attendance Trend': 'मासिक उपस्थिति रुझान',
      'Detailed Statistics': 'विस्तृत सांख्यिकी',
      'Total Members:': 'कुल सदस्य:',
      'Present Today:': 'आज उपस्थित:',
      'Absent Today:': 'आज अनुपस्थित:',
      'Attendance Rate:': 'उपस्थिति दर:',
      'Total Trainers:': 'कुल ट्रेनर्स:',
      // Payment content
      'All Status': 'सभी स्थिति',
      'All': 'सभी',
      'Monthly Recurring': 'मासिक आवर्ती',
      'Pending': 'लंबित',
      'Overdue': 'अतिदेय',
      'Completed': 'पूर्ण',
      // Common labels
      'Month:': 'महीना:',
      'Year:': 'वर्ष:',
      'Month': 'महीना',
      'Year': 'वर्ष',
      // Month names
      'Jan': 'जन','Feb': 'फ़र','Mar': 'मार्च','Apr': 'अप्रै','Jun': 'जून','Jul': 'जुलाई','Aug': 'अग','Sep': 'सित','Oct': 'अक्ट','Nov': 'नव','Dec': 'दिस',
      'January': 'जनवरी','February': 'फ़रवरी','March': 'मार्च','April': 'अप्रैल','May': 'मई','June': 'जून','July': 'जुलाई','August': 'अगस्त','September': 'सितंबर','October': 'अक्टूबर','November': 'नवंबर','December': 'दिसंबर',
      // Common actions, modals, forms
      'Close': 'बंद करें','Apply': 'लागू करें','Reset': 'रीसेट','Delete': 'हटाएं','Remove': 'हटाएं','Update': 'अपडेट करें','Create': 'बनाएं','Submit': 'सबमिट करें',
      'Next': 'अगला','Previous': 'पिछला','Back': 'वापस','Continue': 'जारी रखें','Search': 'खोजें','Filter': 'फ़िल्टर','Clear': 'साफ़ करें','Download': 'डाउनलोड','Print': 'प्रिंट',
      'Yes': 'हाँ','No': 'नहीं','Confirm': 'पुष्टि करें','Are you sure?': 'क्या आप सुनिश्चित हैं?',
      // Common fields
      'Description': 'विवरण','Name': 'नाम','Full Name': 'पूरा नाम','Email': 'ईमेल','Email Address': 'ईमेल पता','Phone': 'फ़ोन','Phone Number': 'फ़ोन नंबर','Phone No.': 'फ़ोन नं.',
      'Mobile': 'मोबाइल','Address': 'पता','City': 'शहर','State': 'राज्य','Country': 'देश','Pincode': 'पिनकोड','Postal Code': 'डाक कोड',
      'Date': 'तिथि','Time': 'समय','Price': 'कीमत','Amount': 'राशि','Status': 'स्थिति','Action': 'क्रिया','Actions': 'क्रियाएँ','Notes': 'नोट्स','Comments': 'टिप्पणियाँ','Category': 'श्रेणी',
      'Title': 'शीर्षक',
      // Notifications top bar
      'All Notifications': 'सभी सूचनाएँ','Mark All Read': 'सभी पढ़ा चिह्नित करें','System': 'सिस्टम','Admin': 'एडमिन','Grievances': 'शिकायतें','Membership': 'सदस्यता','Unread': 'अपठित','No new notifications': 'कोई नई सूचनाएँ नहीं',
      // Dashboard misc
      'Loading new members...': 'नए सदस्यों को लोड किया जा रहा है...','Calculating...': 'गणना हो रही है...','Recent Activity': 'हाल की गतिविधि','Equipment Gallery': 'उपकरण गैलरी',
      // Payment Tab
        'Add Payment': 'भुगतान जोड़ें','Amount Received Breakdown': 'प्राप्त राशि का विवरण','Amount Paid Breakdown': 'भुगतान की गई राशि का विवरण',
        'Pending Payments Details': 'लंबित भुगतान विवरण','Due Payments Details': 'देय भुगतान विवरण','Profit/Loss Analysis': 'लाभ/हानि विश्लेषण','Loading payments...': 'भुगतान लोड हो रहे हैं...',
      'Loading pending payments...': 'लंबित भुगतान लोड हो रहे हैं...','View Full Payment History': 'पूर्ण भुगतान इतिहास देखें',
      // Members & Tables
      'All Members': 'सभी सदस्य','Search by Name, Email, Phone, Membership ID...': 'नाम, ईमेल, फ़ोन, सदस्यता आईडी से खोजें...','Expiring in 3 Days': '3 दिनों में समाप्त हो रहा है','Expiring in 1 Day': '1 दिन में समाप्त हो रहा है',
      'Profile': 'प्रोफ़ाइल','Membership ID': 'सदस्यता आईडी','Age': 'आयु','Gender': 'लिंग','Join Date': 'जुड़ने की तिथि','Valid Until': 'मान्य तिथि',
      // Trainer Management
      'Trainer Management': 'ट्रेनर प्रबंधन','Approved': 'स्वीकृत','Rejected': 'अस्वीकृत','Approve Selected': 'चयनित स्वीकृत करें','Reject Selected': 'चयनित अस्वीकृत करें','No trainers found': 'कोई ट्रेनर नहीं मिला',
      // Equipment
      'Equipment Management': 'उपकरण प्रबंधन','Bulk Import': 'बल्क इम्पोर्ट','Total Equipment': 'कुल उपकरण','Available': 'उपलब्ध','Under Maintenance': 'रखरखाव में','Out of Order': 'खराब',
      // Support & Reviews
      'Support & Communications Center': 'समर्थन और संचार केंद्र','Raise Grievance': 'शिकायत दर्ज करें','Notifications': 'सूचनाएँ','Reviews': 'समीक्षाएँ','Communications': 'संचार',
      'Notification Center': 'सूचना केंद्र','All Types': 'सभी प्रकार','Loading notifications...': 'सूचनाएँ लोड हो रही हैं...',
      'Review Management': 'समीक्षा प्रबंधन','All Ratings': 'सभी रेटिंग','All Reviews': 'सभी समीक्षाएँ','Pending Reply': 'लंबित उत्तर','Loading reviews...': 'समीक्षाएँ लोड हो रही हैं...',
      'Grievance Management': 'शिकायत प्रबंधन','All Priority': 'सभी प्राथमिकता','New Grievance': 'नई शिकायत','Loading grievances...': 'शिकायतें लोड हो रही हैं...',
      'Member Communications': 'सदस्य संचार','All Conversations': 'सभी वार्तालाप','Active': 'सक्रिय','Pending Response': 'लंबित उत्तर','Resolved': 'सुलझाया गया','Search members...': 'सदस्यों को खोजें...','Broadcast': 'प्रसारण',
      'Select a conversation': 'एक वार्तालाप चुनें','Choose a member conversation from the sidebar to start chatting': 'चैट शुरू करने के लिए साइडबार से सदस्य वार्तालाप चुनें'
    }
  };

  // Build a reversible, case-insensitive phrase dictionary for the selected language
  function getPhraseDictFor(lang){
    const enMap = phraseMap.en || {};
    const hiMap = phraseMap.hi || {};
    const out = {};
    if (lang === 'hi'){
      // English -> Hindi
      Object.keys(hiMap).forEach(en => { out[en] = hiMap[en]; });
      // Hindi -> Hindi (stability when reapplying)
      Object.values(hiMap).forEach(hi => { out[hi] = hi; });
    } else {
      // English -> English
      Object.keys(enMap).forEach(en => { out[en] = enMap[en]; });
      // Hindi -> English (reverse)
      Object.entries(hiMap).forEach(([en, hi]) => { out[hi] = en; });
    }
    // Add lowercase variants for case-insensitive lookups
    Object.keys(out).forEach(k => {
      const lk = k.toLowerCase();
      if (!(lk in out)) out[lk] = out[k];
    });
    return out;
  }

  function getLang(){
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  }
  function setLang(lang){
    localStorage.setItem(STORAGE_KEY, lang);
  }

  function normalizeText(txt){
    return (txt || '').replace(/\s+/g,' ').trim();
  }

  function setTextPreserveIcon(el, text){
    if (!el) return;
    const icon = el.querySelector(':scope > i');
    el.textContent = text;
    if (icon) el.prepend(icon);
  }

  function dictLookup(dict, key){
    if (!key) return undefined;
    return dict[key] || dict[key.toLowerCase()];
  }

  function translatePlaceholders(dict){
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
      const ph = el.getAttribute('placeholder');
      const key = normalizeText(ph);
      const v = dictLookup(dict, key);
      if (v) el.setAttribute('placeholder', v);
    });
    
    // Handle explicit placeholder translation attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.setAttribute('placeholder', dict[key]);
      }
    });
  }

  function translateOptions(dict){
    document.querySelectorAll('select option').forEach(opt => {
      const t = normalizeText(opt.textContent);
      const v = dictLookup(dict, t);
      if (v) opt.textContent = v;
    });
  }

  function translateAttributes(root, dict){
    const attrNames = ['title','aria-label','aria-placeholder','alt','data-original-title','data-bs-original-title'];
    root.querySelectorAll('*').forEach(el => {
      attrNames.forEach(attr => {
        if (!el.hasAttribute(attr)) return;
        const val = normalizeText(el.getAttribute(attr));
        if (!val) return;
        const v = dictLookup(dict, val);
        if (v) el.setAttribute(attr, v);
      });
    });
    // input-like values
    root.querySelectorAll('input[type="button"], input[type="submit"], input[type="reset"], input[role="button"]').forEach(el => {
      const v = dictLookup(dict, normalizeText(el.value));
      if (v) el.value = v;
    });
  }

  function escapeRegExp(s){
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function translateTextNodes(root, phrases){
    const keys = Object.keys(phrases).filter(k => k.trim().length > 0);
    if (!keys.length) return;
    // Build regex from ORIGINAL (non-lowercase) keys only to avoid duplicates
    const uniqueKeys = Array.from(new Set(keys.filter(k => k !== k.toLowerCase())));
    const escaped = uniqueKeys.map(escapeRegExp).sort((a,b)=>b.length - a.length);
    if (!escaped.length) return;
    const re = new RegExp(escaped.join('|'), 'gi');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = n.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.nodeName.toLowerCase();
        if (['script','style','noscript'].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (p.closest('input,textarea,select,code,pre')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while((node = walker.nextNode())){
      const original = node.nodeValue;
      const replaced = original.replace(re, (m) => dictLookup(phrases, m) || m);
      if (replaced !== original) node.nodeValue = replaced;
    }
  }

  function applyTranslations(root=document){
    const lang = getLang();
    const dict = translations[lang] || translations[DEFAULT_LANG];
    const phrases = getPhraseDictFor(lang);

    // 1) Translate explicit keys using data-i18n and data-translate
    root.querySelectorAll('[data-i18n], [data-translate]').forEach(el => {
      const key = el.getAttribute('data-i18n') || el.getAttribute('data-translate');
      if (dict[key]) {
        setTextPreserveIcon(el, dict[key]);
      }
    });

    // 2) Translate common UI by phrase (exact matches only)
    const selectors = [
      'h1','h2','h3','h4','h5','h6',
      '.menu-text','.card-title','.stat-title','.payment-stat-title',
      '.pending-payments-title','.recurring-payments-title','.page-title',
      '.modal-title-style','.modal-title','.btn','.button','.filter-btn',
      '.channel-label','.setting-label','.setting-description','label',
      'th','.enhanced-settings-title','.enhanced-settings-description',
      '.payment-chart-title','small','p strong','.setting-label-enhanced',
      '.setting-description-enhanced','button'
    ];
    root.querySelectorAll(selectors.join(',')).forEach(el => {
      // Skip if element has an inner control
      if (el.querySelector('input,textarea,select')) return;
      const current = normalizeText(el.textContent);
      if (!current) return;
      const translated = dictLookup(phrases, current);
      if (translated) {
        setTextPreserveIcon(el, translated);
      }
    });

    // 3) Translate placeholders, options, attributes, and raw text nodes
    translatePlaceholders(phrases);
    translateOptions(phrases);
    translateAttributes(root, phrases);
    translateTextNodes(root, phrases);

    // 4) Sidebar specific (fallback to keys if present)
    const sidebarMap = [
      { sel: '.menu .menu-item:nth-child(1) .menu-text', key:'sidebar.dashboard' },
      { sel: '.menu .menu-item:nth-child(2) .menu-text', key:'sidebar.members' },
      { sel: '.menu .menu-item:nth-child(3) .menu-text', key:'sidebar.trainers' },
      { sel: '.menu .menu-item:nth-child(4) .menu-text', key:'sidebar.attendance' },
      { sel: '.menu .menu-item:nth-child(5) .menu-text', key:'sidebar.payments' },
      { sel: '.menu .menu-item:nth-child(6) .menu-text', key:'sidebar.equipment' },
      { sel: '.menu .menu-item:nth-child(7) .menu-text', key:'sidebar.support' },
      { sel: '.menu .menu-item:nth-child(8) .menu-text', key:'sidebar.settings' }
    ];
    sidebarMap.forEach(m => {
      const el = document.querySelector(m.sel);
      if (el && dict[m.key]) setTextPreserveIcon(el, dict[m.key]);
    });

    // 5) Header specific
    const headerTitle = document.querySelector('.page-header .page-title');
    if (headerTitle && dict['header.dashboard.title']){
      setTextPreserveIcon(headerTitle, dict['header.dashboard.title']);
    }

    // 6) Quick actions specifics
    const qaTitle = document.querySelector('.quick-action-card .card-title');
    if (qaTitle && dict['quick.actions.title']){
      setTextPreserveIcon(qaTitle, dict['quick.actions.title']);
    }
    const customizeBtn = document.getElementById('customizeQuickActionsBtn');
    if (customizeBtn && dict['quick.actions.customize']){
      customizeBtn.innerHTML = `<i class="fas fa-palette"></i> ${dict['quick.actions.customize']}`;
    }
    const qaMap = [
      { sel: '#addMemberBtn span', key: 'quick.actions.addMember' },
      { sel: '#recordPaymentBtn span', key: 'quick.actions.recordPayment' },
      { sel: '#addTrainerBtn span', key: 'quick.actions.addTrainer' },
      { sel: '#uploadEquipmentBtn span', key: 'quick.actions.addEquipment' },
      { sel: '#generateQRCodeBtn span', key: 'quick.actions.generateQR' },
      { sel: '#biometricEnrollBtn span', key: 'quick.actions.enrollBiometric' },
      { sel: '#deviceSetupBtn span', key: 'quick.actions.deviceSetup' },
      { sel: '#sendNotificationQuickBtn span', key: 'quick.actions.sendNotification' }
    ];
    qaMap.forEach(m => {
      const el = document.querySelector(m.sel);
      if (el && dict[m.key]) el.textContent = dict[m.key];
    });
  }

  function initLanguageSelector(){
    const select = document.getElementById('languageSelect');
    if (!select) return;
    // set from storage
    select.value = getLang();
    select.addEventListener('change', () => {
      const lang = select.value;
      setLang(lang);
      applyTranslations();
      
      // Trigger custom event for dynamic content updates
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { language: lang } 
      }));
    });
  }

  function t(key, defaultValue = '') {
    const lang = getLang();
    const dict = translations[lang] || translations[DEFAULT_LANG];
    return dict[key] || defaultValue || key;
  }

  // Expose minimal API
  window.GymI18n = {
    getLang, setLang, applyTranslations, translations, t
  };

  // Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    initLanguageSelector();
    applyTranslations();

    // Observe DOM changes to translate dynamically added content
    let translateScheduled = false;
    const observer = new MutationObserver((mutations) => {
      if (translateScheduled) return;
      translateScheduled = true;
      requestAnimationFrame(() => {
        translateScheduled = false;
        const changedTargets = new Set();
        for (const m of mutations){
          if (m.type === 'attributes' || m.type === 'characterData'){
            changedTargets.add(m.target.nodeType === 1 ? m.target : (m.target.parentElement || document.body));
          } else if (m.type === 'childList'){
            changedTargets.add(m.target);
            m.addedNodes && Array.from(m.addedNodes).forEach(n => { if (n.nodeType === 1) changedTargets.add(n); });
          }
        }
        if (changedTargets.size === 0){
          applyTranslations();
        } else {
          changedTargets.forEach(t => applyTranslations(t));
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
  });
})();
