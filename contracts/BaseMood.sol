// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BaseMood {
    enum Mood {
        Happy,
        Calm,
        Focused,
        Tired,
        Stressed,
        Excited
    }

    struct MoodEntry {
        Mood mood;
        uint256 timestamp;
        uint256 dayId;
        uint256 pointsEarned;
    }

    uint256 public constant POINTS_PER_RECORD = 10;
    uint256 public constant REFERRAL_POINTS = 3;
    uint256 public constant SECONDS_PER_DAY = 1 days;

    mapping(address user => MoodEntry[]) private moodHistory;
    mapping(address user => uint256) private totalPoints;
    mapping(address user => uint256) private lastRecordedAt;
    mapping(address user => mapping(uint256 dayId => bool)) private recordedByDay;
    mapping(address user => address) public referrerOf;

    event MoodRecorded(
        address indexed user,
        Mood mood,
        uint256 indexed dayId,
        uint256 timestamp,
        uint256 pointsEarned,
        address indexed referrer
    );

    event ReferralRecorded(
        address indexed user,
        address indexed referrer,
        uint256 pointsEarned
    );

    error AlreadyRecordedToday(address user, uint256 dayId);
    error InvalidMood(uint8 mood);
    error InvalidReferrer(address user, address referrer);

    function recordMood(uint8 mood, address referrer) external {
        if (mood > uint8(type(Mood).max)) {
            revert InvalidMood(mood);
        }

        uint256 dayId = getCurrentDayId();
        if (recordedByDay[msg.sender][dayId]) {
            revert AlreadyRecordedToday(msg.sender, dayId);
        }

        address storedReferrer = referrerOf[msg.sender];
        address effectiveReferrer = storedReferrer;

        if (storedReferrer == address(0) && referrer != address(0)) {
            if (referrer == msg.sender) {
                revert InvalidReferrer(msg.sender, referrer);
            }
            referrerOf[msg.sender] = referrer;
            effectiveReferrer = referrer;
            totalPoints[referrer] += REFERRAL_POINTS;
            emit ReferralRecorded(msg.sender, referrer, REFERRAL_POINTS);
        }

        recordedByDay[msg.sender][dayId] = true;
        lastRecordedAt[msg.sender] = block.timestamp;
        totalPoints[msg.sender] += POINTS_PER_RECORD;

        moodHistory[msg.sender].push(
            MoodEntry({
                mood: Mood(mood),
                timestamp: block.timestamp,
                dayId: dayId,
                pointsEarned: POINTS_PER_RECORD
            })
        );

        emit MoodRecorded(
            msg.sender,
            Mood(mood),
            dayId,
            block.timestamp,
            POINTS_PER_RECORD,
            effectiveReferrer
        );
    }

    function getCurrentDayId() public view returns (uint256) {
        return block.timestamp / SECONDS_PER_DAY;
    }

    function hasRecordedToday(address user) external view returns (bool) {
        return recordedByDay[user][getCurrentDayId()];
    }

    function hasRecordedOnDay(
        address user,
        uint256 dayId
    ) external view returns (bool) {
        return recordedByDay[user][dayId];
    }

    function getTotalPoints(address user) external view returns (uint256) {
        return totalPoints[user];
    }

    function getLastRecordedAt(address user) external view returns (uint256) {
        return lastRecordedAt[user];
    }

    function getHistoryCount(address user) external view returns (uint256) {
        return moodHistory[user].length;
    }

    function getMoodEntry(
        address user,
        uint256 index
    )
        external
        view
        returns (
            Mood mood,
            uint256 timestamp,
            uint256 dayId,
            uint256 pointsEarned
        )
    {
        MoodEntry storage entry = moodHistory[user][index];
        return (entry.mood, entry.timestamp, entry.dayId, entry.pointsEarned);
    }
}
