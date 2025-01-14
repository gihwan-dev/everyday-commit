import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Github, RefreshCw } from 'lucide-react';
import { PARTICIPANTS } from "@/constants/participants.ts";


interface CommitStatuses {
    [key: string]: boolean;
}

interface Errors {
    [key: string]: string;
}

const query = `query($username: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $username) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
  }
}`;

const GitHubCommitChecker: React.FC = () => {
    const [commitStatuses, setCommitStatuses] = useState<CommitStatuses>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<Errors>({});

    const checkCommits = async (): Promise<void> => {
        setLoading(true);
        setErrors({});
        const newStatuses: CommitStatuses = {};

        // 'ko-KR' 지역(KST) 기준으로 오늘 날짜 계산
        const formatter = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul" });
        const today = formatter.format(new Date()); // 오늘 날짜를 "YYYY-MM-DD" 형식으로 가져옴

        const [year, month, day] = today
            .split(". ")
            .map((v) => v.replace(".", "").trim()); // "2023. 10. 31." -> ["2023", "10", "31"]

        const from = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00+09:00`; // KST 0시 시작
        const to = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T23:59:59+09:00`; // KST 24시 끝

        for (const username of PARTICIPANTS) {
            try {
                const response = await fetch('https://api.github.com/graphql', {
                    method: 'POST',
                    headers: {
                        'Authorization': `bearer ${import.meta.env.VITE_GITHUB_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query,
                        variables: {
                            username,
                            from, // 오늘 KST 0시 시작
                            to,   // 오늘 KST 24시 끝
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error('GitHub API 요청에 실패했습니다.');
                }

                const data = await response.json();

                if (data.errors) {
                    throw new Error(data.errors[0].message);
                }

                const contributions = data.data?.user?.contributionsCollection?.contributionCalendar;
                if (!contributions) {
                    throw new Error('데이터를 찾을 수 없습니다.');
                }

                // 오늘의 커밋 수 확인
                const todayContributions = contributions.weeks
                    .flatMap(week => week.contributionDays)
                    .find(day => day.date === from.split("T")[0]); // ISO 날짜만 비교

                newStatuses[username] = todayContributions ? todayContributions.contributionCount > 0 : false;
            } catch (error) {
                console.error('Error fetching data for', username, error);
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