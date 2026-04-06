import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  static const String _lastUpdated = '05 April 2026';

  static const List<String> _highlights = [
    'We collect only the information needed to run gym operations and secure accounts.',
    'Our data practices align with applicable Indian data protection and cyber security laws.',
    'Payment processing is handled through authorized providers and governed by strict controls.',
    'You can request access, correction, or deletion of personal data, subject to legal obligations.',
    'We do not sell personal information in identifiable form to third parties.',
  ];

  static const List<_PolicySection> _sections = [
    _PolicySection(
      title: '1. Scope',
      body:
          'This Privacy Policy applies to Gym-Wale Admin App and related services used by gym owners, staff, and authorized operators to manage memberships, attendance, communication, billing, and support workflows.',
    ),
    _PolicySection(
      title: '2. Indian Legal Compliance Framework',
      body:
          'This policy is prepared and operated in alignment with applicable Indian legal requirements, including the Digital Personal Data Protection Act, 2023 (DPDP Act), the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and relevant CERT-In cyber incident reporting directions as applicable to our operations.',
    ),
    _PolicySection(
      title: '3. Information We Collect',
      body:
          'We may collect identity details (name, email, phone), business details (gym name, address, tax or billing details), member operational data (attendance, plan status), payment metadata (transaction status, invoice details), device and log data (IP, browser/app diagnostics), and support communications.',
    ),
    _PolicySection(
      title: '4. How We Use Information',
      body:
          'We use data to create and manage accounts, operate dashboard features, verify and approve gyms, process billing workflows, provide customer support, send service notifications, improve product performance, prevent fraud or abuse, and comply with legal requirements.',
    ),
    _PolicySection(
      title: '5. Sharing and Disclosure',
      body:
          'We may share data with trusted processors such as cloud hosting, analytics, messaging, and payment partners strictly for service delivery. We may also share information where required by law, court orders, or lawful government requests. We do not sell personal information in identifiable form.',
    ),
    _PolicySection(
      title: '6. Data Security',
      body:
          'We use commercially reasonable safeguards including encryption in transit, access controls, environment segregation, audit logging, and periodic security reviews. No digital system can guarantee absolute security.',
    ),
    _PolicySection(
      title: '7. Data Retention',
      body:
          'We retain personal data for as long as necessary for account operation, legal compliance, dispute resolution, and enforcement of agreements. Data may be deleted or anonymized when no longer required.',
    ),
    _PolicySection(
      title: '8. International Processing',
      body:
          'Infrastructure or vendors may process data in India or other jurisdictions. Where cross-border processing occurs, we implement safeguards consistent with applicable law.',
    ),
    _PolicySection(
      title: '9. Children',
      body:
          'The platform is intended for business and operational use and is not directed to children under 18. If we discover accidental collection from minors, we will take reasonable steps to delete such data.',
    ),
    _PolicySection(
      title: '10. Your Rights',
      body:
          'Subject to applicable law, you may request access, correction, deletion, and withdrawal of consent where processing relies on consent. You may also raise grievances regarding privacy handling.',
    ),
    _PolicySection(
      title: '11. Policy Updates',
      body:
          'We may update this policy to reflect legal, technical, or product changes. Updated versions become effective when posted in the app or associated service channels.',
    ),
    _PolicySection(
      title: '12. Contact',
      body:
          'For privacy and grievance matters, contact: privacy@gymwale.com. Include your account email, concern summary, and relevant details so we can resolve your request promptly.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy Policy'),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [const Color(0xFF0F172A), const Color(0xFF1E293B)]
                : [Colors.white, const Color(0xFFF8FAFC)],
          ),
        ),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Gym-Wale Privacy Policy',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              'Last Updated: $_lastUpdated',
              style: TextStyle(
                color: isDark ? Colors.white70 : Colors.black54,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 14),
            _InfoCard(
              title: 'Important Highlights',
              items: _highlights,
            ),
            const SizedBox(height: 14),
            for (final section in _sections) ...[
              _SectionCard(section: section),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }
}

class _PolicySection {
  final String title;
  final String body;

  const _PolicySection({required this.title, required this.body});
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.items});

  final String title;
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          for (final item in items) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('• '),
                Expanded(child: Text(item)),
              ],
            ),
            const SizedBox(height: 5),
          ],
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.section});

  final _PolicySection section;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            section.title,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(section.body),
        ],
      ),
    );
  }
}
