import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="py-16 bg-neutral-cream dark:bg-gray-900 min-h-screen transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-accent dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            How we collect, use, and protect your information
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 transition-colors">
          <div className="prose prose-lg max-w-none dark:prose-invert">
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
              <h2 className="font-playfair text-xl font-bold text-blue-800 dark:text-blue-200 mb-2">Our Commitment to Your Privacy</h2>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                La Bella Noches Co. ("we," "us," or "our") respects your privacy and is committed to protecting your personal information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website 
                www.labellanochesco.com, use our services, or interact with us through SMS, WhatsApp, or other communication channels.
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-sm mt-3">
                By using our website or services, you consent to the data practices described in this Privacy Policy. 
                If you do not agree with the practices described in this policy, please do not access or use our services.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">1. Information We Collect</h2>
              
              <h3 className="font-semibold text-accent dark:text-white mb-3">Personal Information You Provide</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We may collect personal information that you voluntarily provide to us, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2 mb-4">
                <li>Name and contact information (phone number, email address)</li>
                <li>Account registration details</li>
                <li>Order information and dining preferences</li>
                <li>Communication preferences for SMS and WhatsApp marketing</li>
                <li>Feedback, reviews, and customer service inquiries</li>
                <li>Payment information (processed securely through third-party providers)</li>
              </ul>

              <h3 className="font-semibold text-accent dark:text-white mb-3">Information Collected Automatically</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                When you visit our website, we may automatically collect certain information, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>IP address and location information</li>
                <li>Browser type and operating system</li>
                <li>Pages visited and time spent on our website</li>
                <li>Referring website and search terms used</li>
                <li>Device information and mobile identifiers</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We use the information we collect for various purposes, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Processing and fulfilling your orders and reservations</li>
                <li>Providing customer service and support</li>
                <li>Sending SMS and WhatsApp marketing messages (with your consent)</li>
                <li>Personalizing your experience and improving our services</li>
                <li>Conducting market research and analytics</li>
                <li>Sending important updates about our services</li>
                <li>Detecting and preventing fraud or security breaches</li>
                <li>Complying with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">3. SMS and WhatsApp Communications</h2>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Marketing Messages</h3>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  By providing your phone number and opting in to our SMS or WhatsApp marketing, you consent to receive 
                  promotional messages, special offers, menu updates, and other marketing communications. Message and data 
                  rates may apply. Message frequency varies.
                </p>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You can opt out of marketing messages at any time by:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Replying "STOP" to any SMS message</li>
                <li>Sending "STOP" via WhatsApp</li>
                <li>Contacting us directly at hello@labellanochesco.com</li>
                <li>Updating your preferences on our website</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, 
                except in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>With service providers who assist us in operating our business (payment processors, delivery services, etc.)</li>
                <li>When required by law or to protect our rights and safety</li>
                <li>In connection with a business transfer or acquisition</li>
                <li>With your explicit consent for specific purposes</li>
                <li>To prevent fraud or illegal activities</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">5. Data Security</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Encryption of sensitive data in transit and at rest</li>
                <li>Secure servers and databases with access controls</li>
                <li>Regular security audits and updates</li>
                <li>Employee training on data protection practices</li>
                <li>Secure payment processing through certified providers</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                However, no method of transmission over the internet or electronic storage is 100% secure. While we strive 
                to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">6. Cookies and Tracking Technologies</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We use cookies and similar tracking technologies to enhance your experience on our website. These technologies help us:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2 mb-4">
                <li>Remember your preferences and settings</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Provide personalized content and advertisements</li>
                <li>Improve website functionality and performance</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300">
                You can control cookie settings through your browser preferences. Please note that disabling cookies may 
                affect the functionality of our website.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">7. Your Privacy Rights</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Depending on your location, you may have certain rights regarding your personal information, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li><strong>Access:</strong> Request information about the personal data we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
                <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
                <li><strong>Opt-out:</strong> Withdraw consent for marketing communications at any time</li>
                <li><strong>Objection:</strong> Object to certain types of data processing</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                To exercise these rights, please contact us using the information provided at the end of this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">8. Children's Privacy</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Our services are not directed to children under the age of 13, and we do not knowingly collect personal 
                information from children under 13. If we become aware that we have collected personal information from a 
                child under 13 without parental consent, we will take steps to remove that information from our systems. 
                If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">9. Data Retention</h2>
              <p className="text-gray-600 dark:text-gray-300">
                We retain your personal information only for as long as necessary to fulfill the purposes for which it was 
                collected, comply with legal obligations, resolve disputes, and enforce our agreements. The retention period 
                may vary depending on the type of information and applicable legal requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">10. Third-Party Links</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Our website may contain links to third-party websites or services. We are not responsible for the privacy 
                practices or content of these third-party sites. We encourage you to review the privacy policies of any 
                third-party sites you visit.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">11. International Transfers</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Your information may be transferred to and processed in countries other than your country of residence. 
                These countries may have data protection laws that are different from the laws of your country. We ensure 
                that such transfers are subject to appropriate safeguards.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">12. Changes to This Privacy Policy</h2>
              <p className="text-gray-600 dark:text-gray-300">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal 
                requirements, or other factors. We will notify you of any material changes by posting the updated policy on 
                our website and updating the "Last Updated" date. For significant changes, we may also provide additional 
                notice through email or SMS.
              </p>
            </section>

            {/* Contact Information */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-8 mt-12">
              <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">Contact Us</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-neutral-cream dark:bg-gray-700 rounded-lg p-6">
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  <strong>La Bella Noches Co.</strong>
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Privacy Officer
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  123 Gourmet Street, Foodie District
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Phone: +1 (844) 543-7419
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Email: privacy@labellanochesco.com
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Additional Notice */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-8">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Your Consent</h3>
              <p className="text-green-700 dark:text-green-300 text-sm">
                By using our website, placing orders, or opting in to our SMS/WhatsApp communications, you consent to the 
                collection and use of your information as described in this Privacy Policy. You may withdraw your consent 
                at any time by contacting us or following the opt-out instructions in our messages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;