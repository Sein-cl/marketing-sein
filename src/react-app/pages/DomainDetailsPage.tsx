import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDomainById, issueCertificate, getCertificatesForDomain, Domain, CertificateSummary, IssueCertificateResponse } from '../services/api';

const DomainDetailsPage: React.FC = () => {
    const { domainId } = useParams<{ domainId: string }>();
    const [domain, setDomain] = useState<Domain | null>(null);
    const [certificates, setCertificates] = useState<CertificateSummary[]>([]);
    const [isLoadingDomain, setIsLoadingDomain] = useState(true);
    const [isLoadingCerts, setIsLoadingCerts] = useState(true);
    const [isIssuing, setIsIssuing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null); // Combined error for fetching domain/certs
    const [issueMessage, setIssueMessage] = useState<string | null>(null); // For success/error of issuance

    const fetchDomainDetails = useCallback(async () => {
        if (!domainId) return;
        setIsLoadingDomain(true);
        setFetchError(null);
        try {
            const currentDomain = await getDomainById(domainId);
            setDomain(currentDomain);
        } catch (err: any) {
            setFetchError(err.message || 'Failed to fetch domain details.');
            setDomain(null);
        } finally {
            setIsLoadingDomain(false);
        }
    }, [domainId]);

    const fetchCertificates = useCallback(async () => {
        if (!domainId) return;
        setIsLoadingCerts(true);
        // setFetchError(null); // Don't clear general fetch error, focus on cert specific
        try {
            const certs = await getCertificatesForDomain(domainId);
            setCertificates(certs);
        } catch (err: any) {
            // Append to fetchError or set a specific cert error
            setFetchError(prev => prev ? `${prev}\nFailed to fetch certificates: ${err.message}` : `Failed to fetch certificates: ${err.message}`);
            setCertificates([]);
        } finally {
            setIsLoadingCerts(false);
        }
    }, [domainId]);

    useEffect(() => {
        fetchDomainDetails();
        fetchCertificates();
    }, [domainId, fetchDomainDetails, fetchCertificates]);

    const handleIssueCertificate = async () => {
        if (!domainId) return;
        setIsIssuing(true);
        setIssueMessage(null); // Clear previous messages
        try {
            const response: IssueCertificateResponse = await issueCertificate(domainId);
            setIssueMessage(response.message || 'Certificate issuance process started successfully.');
            // Poll for status or refresh after a delay
            setTimeout(fetchCertificates, 7000); // Refresh certs after 7s (allow some time for issuance)
        } catch (err: any) {
            // err should be an Error, its .message property is what we want
            const apiError = err as Error;
            setIssueMessage(apiError.message || 'Failed to issue certificate.');
        } finally {
            setIsIssuing(false);
        }
    };

    if (isLoadingDomain) return <p>Loading domain details...</p>;
    // If domain fetch failed, show error and link to dashboard
    if (fetchError && !domain) return (
        <div>
            <p className="error-message">{fetchError}</p>
            <Link to="/dashboard">Go to Dashboard</Link>
        </div>
    );
    if (!domain) return <p>Domain not found. <Link to="/dashboard">Go to Dashboard</Link></p>;


    return (
        <div className="page-container domain-details-page">
            <header className="page-header">
                <h2>Domain: {domain.fqdn}</h2>
                <Link to="/dashboard" className="back-link">Back to Dashboard</Link>
            </header>

            <div className="domain-info-card card">
                <p><strong>FQDN:</strong> {domain.fqdn}</p>
                <p><strong>Status:</strong> <span className={`status-badge status-${domain.status.toLowerCase()}`}>{domain.status}</span></p>
                <p><strong>Added on:</strong> {new Date(domain.created_at).toLocaleDateString()}</p>
                <p><strong>Last updated:</strong> {new Date(domain.updated_at).toLocaleDateString()}</p>
            </div>

            {fetchError && !isLoadingDomain && <p className="error-message">{fetchError}</p>}

            <div className="certificate-management card">
                <h3>Certificates</h3>
                <button onClick={handleIssueCertificate} disabled={isIssuing || isLoadingCerts} className="action-button">
                    {isIssuing ? 'Issuing Certificate...' : 'Issue New Certificate (Staging)'}
                </button>
                {issueMessage && <p className={issueMessage.startsWith("Failed") ? "error-message" : "success-message"}>{issueMessage}</p>}

                {isLoadingCerts ? <p>Loading certificates...</p> : (
                    certificates.length === 0 ? <p>No certificates found for this domain.</p> : (
                        <ul className="certificate-list">
                            {certificates.map(cert => (
                                <li key={cert.id} className={`certificate-item card-sm status-${cert.status.toLowerCase()}`}>
                                    <p><strong>ID:</strong> {cert.id}</p>
                                    <p><strong>Common Name:</strong> {cert.common_name}</p>
                                    <p><strong>Status:</strong> <span className={`status-badge status-${cert.status.toLowerCase()}`}>{cert.status}</span></p>
                                    <p><strong>Issued:</strong> {new Date(cert.issued_at).toLocaleString()}</p>
                                    <p><strong>Expires:</strong> {new Date(cert.expires_at).toLocaleString()}</p>
                                </li>
                            ))}
                        </ul>
                    )
                )}
            </div>
        </div>
    );
};
export default DomainDetailsPage;
