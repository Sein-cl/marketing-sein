import React, { useEffect, useState } from 'react';
import { getDomains, deleteDomain, Domain } from '../services/api';
import { Link } from 'react-router-dom'; // Import Link at the top

const DomainList: React.FC = () => {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDomains = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getDomains();
            setDomains(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch domains');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDomains();
    }, []);

    const handleDelete = async (domainId: string) => {
        if (window.confirm('Are you sure you want to delete this domain?')) {
            try {
                await deleteDomain(domainId);
                setDomains(prevDomains => prevDomains.filter(d => d.id !== domainId)); // Optimistic update
            } catch (err: any) {
                setError(err.message || 'Failed to delete domain. Please refresh.');
            }
        }
    };

    if (loading) return <p>Loading domains...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="domain-list-container card">
            <h3>Your Domains</h3>
            {domains.length === 0 ? (
                <p>No domains added yet.</p>
            ) : (
                <ul className="domain-list">
                    {domains.map(domain => (
                        <li key={domain.id} className="domain-list-item card-sm">
                            <div className="domain-info">
                                <span className="domain-fqdn">{domain.fqdn}</span>
                                <span className={`status-badge status-${domain.status.toLowerCase()}`}>{domain.status}</span>
                            </div>
                            <div className="domain-actions">
                                <Link to={`/dashboard/domains/${domain.id}`} className="manage-button action-button">Manage</Link>
                                <button onClick={() => handleDelete(domain.id)} className="delete-button action-button">Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
export default DomainList;
