import 'package:flutter/material.dart';

class TermsAndConditionsScreen extends StatelessWidget {
  const TermsAndConditionsScreen({super.key});

  static const String _effectiveDate = '05 April 2026';

  static const List<String> _highlights = [
    'Only authorized gym owners and staff may create and use admin accounts.',
    'You are responsible for data accuracy, account security, and lawful operations.',
    'Subscription, billing, suspension, and termination are governed by these terms.',
    'Use of the platform means acceptance of these Terms and the Privacy Policy.',
  ];

  static const List<_TermsSection> _sections = [
    _TermsSection(
      title: '1. Acceptance of Terms',
      body:
          'By registering or using Gym-Wale Admin App, you agree to these Terms and Conditions and our Privacy Policy. If you do not agree, do not use the platform.',
    ),
    _TermsSection(
      title: '2. Eligibility and Account Responsibility',
      body:
          'You must be legally authorized to operate on behalf of your gym. You are responsible for account credentials, actions performed through your account, and immediate reporting of unauthorized access.',
    ),
    _TermsSection(
      title: '3. Platform Services',
      body:
          'The platform offers features including gym onboarding, member and attendance workflows, communication tools, and operational reporting. Features may evolve, be improved, or be discontinued from time to time.',
    ),
    _TermsSection(
      title: '4. Acceptable Use',
      body:
          'You agree not to misuse the service, bypass security controls, upload harmful code, infringe rights, or process data in violation of applicable law. We may restrict or suspend access for abusive or unlawful use.',
    ),
    _TermsSection(
      title: '5. Fees and Payments',
      body:
          'Where paid plans apply, you agree to applicable pricing, billing cycles, and taxes. Delayed or failed payments may result in service limitations or suspension until dues are cleared.',
    ),
    _TermsSection(
      title: '6. Data and Privacy',
      body:
          'Each gym remains responsible for lawful collection and use of member data. Gym-Wale processes data to deliver services and protect platform security, as detailed in the Privacy Policy.',
    ),
    _TermsSection(
      title: '7. Intellectual Property',
      body:
          'All platform software, branding, and content are owned by Gym-Wale or its licensors. These terms grant a limited, non-exclusive, revocable right to use the service for internal business operations.',
    ),
    _TermsSection(
      title: '8. Service Availability and Disclaimer',
      body:
          'We aim for reliable service but do not guarantee uninterrupted or error-free availability. Services are provided on an as-available and as-is basis to the extent permitted by law.',
    ),
    _TermsSection(
      title: '9. Limitation of Liability',
      body:
          'To the maximum extent permitted by law, Gym-Wale shall not be liable for indirect, incidental, special, or consequential damages arising from platform use or inability to use the platform.',
    ),
    _TermsSection(
      title: '10. Suspension and Termination',
      body:
          'We may suspend or terminate access for breach of these terms, non-payment, legal requirements, or security risks. You may stop using the service at any time, subject to outstanding obligations.',
    ),
    _TermsSection(
      title: '11. Governing Law and Disputes',
      body:
          'These terms are governed by applicable Indian laws. Parties should first attempt good-faith resolution of disputes before initiating formal proceedings.',
    ),
    _TermsSection(
      title: '12. Contact',
      body:
          'For legal or terms-related questions, contact: legal@gymwale.com.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Terms and Conditions'),
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
              'Gym-Wale Terms and Conditions',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              'Effective Date: $_effectiveDate',
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

class _TermsSection {
  final String title;
  final String body;

  const _TermsSection({required this.title, required this.body});
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
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
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

  final _TermsSection section;

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
