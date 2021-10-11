---
title: 'Unlocking locked resource groups in GitLab CI'
date: '2021-09-06T12:04:00+02:00'
taxonomy:
    category:
        - blog
    tag:
        - gitlab
        - ci
        - stuck
        - locked
        - resource_group
        - unlock
    author:
        - jens
---

Even though Gitlab has been around for a long time, there are still times where it can crash. Normally that wouldn't cause any issues, besides being mildly annoying. However, when Gitlab crashes (and I mean *really* crashes) during a CI Build, sometimes invalid data remains in the Database.

On our work Gitlab, after we'd migrated most of the Jenkins jobs, I hit one of those situations. Because we had migrated a lot of Jenkins jobs, which all ran hourly, we managed to fill the Disk completely with log files.

After cleaning the mess up, everything seemed to be running again, apart from *some* CI Pipelines. They seemed to be just stuck, waiting for resource groups.

While migrating from Jenkins, we had used `disableConcurrentBuilds()` to prevent multiple of the same Job running concurrently. On Gitlab, we had migrated that to use resource groups, which had mostly the same outcome.

Digging deeper, I found a couple open Gitlab issues, like [this](https://gitlab.com/gitlab-org/gitlab/-/issues/208792), but they lead nowhere.

As it turns out, the resource groups are just entries in the PostgreSQL database used by Gitlab. It was pretty easy to figure out which tables are relevant, all though it was a bit confusing that the lock seems to be saved in 2 tables.

Anyways, to unlock your project's resource groups, run the following SQL snippet

```sql
-- 123 is the Project ID, can be found on the Project overview
delete from ci_resources where resource_group_id in (select id from ci_resource_groups where project_id = 123);
delete from ci_resource_groups where project_id = 123;
```

To get access to the PostgreSQL console of a Gitlab Omnibus install, run `docker exec -it gitlab_gitlab_1 gitlab-psql`.
