import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Github, RefreshCw } from 'lucide-react';

const PARTICIPANTS = [
    'gihwan-dev',
    "Baek-Seungyeop",
    "Byeolnabi",
    "tlswl7479",
    "vvalvvizal",
    "yujini1121",
    // 여기에 다른 참가자들의 GitHub 사용자명을 추가하세요
] as const;

interface CommitStatuses {
    [key: string]: boolean;
}

interface Errors {
    [key: string]: string;
}

interface GitHubEvent {
    type: string;
    created_at: string;
}

const GitHubCommitChecker: React.FC = () => {
    const [commitStatuses, setCommitStatuses] = useState<CommitStatuses>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<Errors>({});

    const checkCommits = async (): Promise<void> => {
        setLoading(true);
        setErrors({});
        const newStatuses: CommitStatuses = {};

        for (const username of PARTICIPANTS) {
            try {
                const response = await fetch(`https://api.github.com/users/${username}/events`, {
                    headers: {
                        'Authorization': `token ${import.meta.env.VITE_GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (!response.ok) {
                    throw new Error(response.status === 404 ? '사용자를 찾을 수 없습니다.' : '데이터를 가져오는데 실패했습니다.');
                }

                const events: GitHubEvent[] = await response.json();
                const today = new Date().toISOString().split('T')[0];

                const todayCommit = events.some(event => {
                    if (event.type === 'PushEvent') {
                        const eventDate = new Date(event.created_at).toISOString().split('T')[0];
                        return eventDate === today;
                    }
                    return false;
                });

                newStatuses[username] = todayCommit;
            } catch (error) {
                setErrors(prev => ({
                    ...prev,
                    [username]: error instanceof Error ? error.message : '알 수 없는 에러가 발생했습니다.'
                }));
            }
        }

        setCommitStatuses(newStatuses);
        setLoading(false);
    };

    useEffect(() => {
        checkCommits();
    }, []);

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Github className="w-6 h-6" />
                        1일 1커밋 현황
                    </div>
                    <Button
                        onClick={checkCommits}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        새로고침
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {PARTICIPANTS.map(username => (
                        <Alert
                            key={username}
                            variant={errors[username] ? "destructive" : commitStatuses[username] ? "default" : "destructive"}
                            className="flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                {errors[username] ? (
                                    <AlertTitle className="text-red-500">{username}: {errors[username]}</AlertTitle>
                                ) : (
                                    <>
                                        {commitStatuses[username] ? (
                                            <>
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                <AlertTitle>{username}</AlertTitle>
                                                <span className="text-green-500 text-sm">오늘 커밋 완료!</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-5 h-5 text-red-500" />
                                                <AlertTitle>{username}</AlertTitle>
                                                <span className="text-red-500 text-sm">아직 커밋하지 않음</span>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </Alert>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default GitHubCommitChecker;